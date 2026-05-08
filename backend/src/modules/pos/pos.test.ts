import request from 'supertest';
import app from '../../app';
import prisma from '../../lib/prisma';
import jwt from 'jsonwebtoken';

process.env.JWT_SECRET = 'test-secret';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret';
process.env.FRONTEND_URL = 'http://localhost:5173';

jest.mock('../../lib/socket', () => ({
  emitToRoom: jest.fn(),
  getIO: jest.fn(),
  initSocket: jest.fn(),
}));

// ── Unit: allergen detection ──────────────────────────────────────────────────
describe('Allergen detection (unit)', () => {
  it('returns allergens array for an item that has them', async () => {
    const branch = await prisma.branch.create({
      data: { name: 'POS Test Branch', address: 'Addr', city: 'City', phone: '000', email: 'pos@test.nl' },
    });
    const item = await prisma.menuItem.create({
      data: { branchId: branch.id, name: 'Pinda Soep', price: 800, category: 'soep', allergens: ['pinda', 'soja'] },
    });

    const token = jwt.sign({ sub: 'u1', email: 'e@e.nl', role: 'cashier', branchId: branch.id }, process.env.JWT_SECRET!, { expiresIn: '1h' });
    const res = await request(app)
      .get(`/api/v1/pos/allergens/${item.id}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.data.allergens).toContain('pinda');
    expect(res.body.data.allergens).toContain('soja');

    await prisma.menuItem.delete({ where: { id: item.id } });
    await prisma.branch.delete({ where: { id: branch.id } });
  });
});

// ── Integration: order → allergen confirm → payment ───────────────────────────
describe('POS order flow (integration)', () => {
  let branchId: string;
  let cashierToken: string;
  let cashierUserId: string;
  let menuItemId: string;
  let orderId: string;

  beforeAll(async () => {
    const branch = await prisma.branch.create({
      data: { name: 'POS Flow Branch', address: 'Addr', city: 'City', phone: '000', email: 'posflow@test.nl' },
    });
    branchId = branch.id;

    const user = await prisma.user.create({
      data: { email: 'cashier-pos@test.nl', passwordHash: 'x', role: 'cashier', branchId },
    });
    cashierUserId = user.id;
    cashierToken = jwt.sign({ sub: user.id, email: user.email, role: 'cashier', branchId }, process.env.JWT_SECRET!, { expiresIn: '1h' });

    const item = await prisma.menuItem.create({
      data: { branchId, name: 'Allergen Item', price: 1000, category: 'test', allergens: ['gluten', 'melk'] },
    });
    menuItemId = item.id;
  });

  afterAll(async () => {
    await prisma.allergenLog.deleteMany({ where: { orderId } });
    await prisma.transaction.deleteMany({ where: { orderId } });
    await prisma.orderItem.deleteMany({ where: { orderId } });
    await prisma.order.deleteMany({ where: { id: orderId } });
    await prisma.menuItem.deleteMany({ where: { branchId } });
    await prisma.user.deleteMany({ where: { id: cashierUserId } });
    await prisma.branch.delete({ where: { id: branchId } });
    await prisma.$disconnect();
  });

  it('creates an order', async () => {
    const res = await request(app)
      .post('/api/v1/pos/orders')
      .set('Authorization', `Bearer ${cashierToken}`)
      .send({ branchId, isTakeaway: true });

    expect(res.status).toBe(201);
    orderId = res.body.data.id;
    expect(orderId).toBeDefined();
  });

  it('adds item with allergens to order', async () => {
    const res = await request(app)
      .put(`/api/v1/pos/orders/${orderId}`)
      .set('Authorization', `Bearer ${cashierToken}`)
      .send({ items: [{ menuItemId, quantity: 1 }] });

    expect(res.status).toBe(200);
    expect(res.body.data.items).toHaveLength(1);
  });

  it('confirms allergens — writes to allergen_log', async () => {
    const res = await request(app)
      .post('/api/v1/pos/allergens/confirm')
      .set('Authorization', `Bearer ${cashierToken}`)
      .send({ orderId, menuItemId, allergensShown: ['gluten', 'melk'] });

    expect(res.status).toBe(201);
    const log = await prisma.allergenLog.findFirst({ where: { orderId } });
    expect(log).not.toBeNull();
    expect(log!.allergensShown).toContain('gluten');
  });

  it('processes cash payment — creates transaction record', async () => {
    const res = await request(app)
      .post(`/api/v1/pos/orders/${orderId}/payment`)
      .set('Authorization', `Bearer ${cashierToken}`)
      .send({ paymentMethod: 'cash', cashGiven: 2000 });

    expect(res.status).toBe(200);
    expect(res.body.data.change).toBe(1000);

    const tx = await prisma.transaction.findFirst({ where: { orderId } });
    expect(tx).not.toBeNull();
    expect(tx!.amount).toBe(1000);
  });
});
