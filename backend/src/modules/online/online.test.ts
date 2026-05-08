import request from 'supertest';
import app from '../../app';
import prisma from '../../lib/prisma';

process.env.JWT_SECRET = 'test-secret';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret';
process.env.FRONTEND_URL = 'http://localhost:5173';
process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test';

// Mock stripe module (ES module default export pattern)
jest.mock('stripe', () => {
  const StripeClass = jest.fn().mockImplementation(() => ({
    paymentIntents: {
      create: jest.fn().mockResolvedValue({ client_secret: 'pi_test_secret', amount: 1000 }),
    },
    webhooks: {
      constructEvent: jest.fn().mockImplementation((body: Buffer | string) => {
        const str = Buffer.isBuffer(body) ? body.toString() : String(body);
        return JSON.parse(str);
      }),
    },
  }));
  return { __esModule: true, default: StripeClass };
});

// Mock mailer
jest.mock('../../lib/mailer', () => ({
  sendMail: jest.fn().mockResolvedValue(undefined),
}));

// Mock socket
jest.mock('../../lib/socket', () => ({
  emitToRoom: jest.fn(),
  getIO: jest.fn(),
  initSocket: jest.fn(),
}));

describe('Online Ordering', () => {
  let branchId: string;
  let menuItemId: string;

  beforeAll(async () => {
    const branch = await prisma.branch.create({
      data: { name: 'Online Test Branch', address: 'Addr', city: 'City', phone: '000', email: 'online@test.nl' },
    });
    branchId = branch.id;

    const item = await prisma.menuItem.create({
      data: { branchId, name: 'Online Item', price: 1200, category: 'test', allergens: ['gluten'] },
    });
    menuItemId = item.id;
  });

  afterAll(async () => {
    await prisma.transaction.deleteMany({ where: { branchId } });
    await prisma.orderItem.deleteMany({ where: { order: { branchId } } });
    await prisma.order.deleteMany({ where: { branchId } });
    await prisma.customer.deleteMany({ where: { email: 'test@klant.nl' } });
    await prisma.menuItem.deleteMany({ where: { branchId } });
    await prisma.branch.delete({ where: { id: branchId } });
    await prisma.$disconnect();
  });

  it('GET /api/v1/online/menu — returns menu items unauthenticated', async () => {
    const res = await request(app).get('/api/v1/online/menu');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data.items)).toBe(true);
  });

  it('handleStripeWebhook — creates order, upserts customer, emits Socket.IO on payment_intent.succeeded', async () => {
    const { handleStripeWebhook } = require('./online.service');
    const { emitToRoom } = require('../../lib/socket');

    const webhookPayload = Buffer.from(JSON.stringify({
      type: 'payment_intent.succeeded',
      data: {
        object: {
          id: 'pi_test_123',
          amount: 1200,
          metadata: {
            branchId,
            customerEmail: 'test@klant.nl',
            customerName: 'Test Klant',
            isTakeaway: 'false',
            items: JSON.stringify([{ menuItemId, quantity: 1 }]),
            notes: '',
          },
        },
      },
    }));

    const result = await handleStripeWebhook(webhookPayload, 'test-sig');

    expect(result.received).toBe(true);
    expect(result.orderId).toBeDefined();

    expect(emitToRoom).toHaveBeenCalledWith(
      `branch:${branchId}:pos`,
      'order:new',
      expect.objectContaining({ order: expect.objectContaining({ branchId }) }),
    );

    const order = await prisma.order.findUnique({ where: { id: result.orderId } });
    expect(order).not.toBeNull();
    expect(order!.source).toBe('online');
    expect(order!.paymentStatus).toBe('paid');

    const customer = await prisma.customer.findUnique({ where: { email: 'test@klant.nl' } });
    expect(customer).not.toBeNull();
    expect(customer!.visitCount).toBe(1);
  });
});
