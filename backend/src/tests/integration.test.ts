import request from 'supertest';
import app from '../app';
import prisma from '../lib/prisma';
import jwt from 'jsonwebtoken';

process.env.JWT_SECRET = 'test-secret';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret';
process.env.FRONTEND_URL = 'http://localhost:5173';

jest.mock('../lib/socket', () => ({
  emitToRoom: jest.fn(),
  getIO: jest.fn(),
  initSocket: jest.fn(),
}));

// ── POS → Finance flow ────────────────────────────────────────────────────────
describe('POS → Finance integration', () => {
  let branchId: string;
  let cashierToken: string;
  let ownerToken: string;
  let cashierId: string;
  let ownerId: string;
  let menuItemId: string;
  let orderId: string;

  beforeAll(async () => {
    const branch = await prisma.branch.create({
      data: { name: 'Integration Test Branch', address: 'Addr', city: 'City', phone: '000', email: 'integration@test.nl' },
    });
    branchId = branch.id;

    const cashier = await prisma.user.create({
      data: { email: 'cashier-int@test.nl', passwordHash: 'x', role: 'cashier', branchId },
    });
    cashierId = cashier.id;
    cashierToken = jwt.sign({ sub: cashier.id, email: cashier.email, role: 'cashier', branchId }, process.env.JWT_SECRET!, { expiresIn: '1h' });

    const owner = await prisma.user.create({
      data: { email: 'owner-int@test.nl', passwordHash: 'x', role: 'owner', branchId: null },
    });
    ownerId = owner.id;
    ownerToken = jwt.sign({ sub: owner.id, email: owner.email, role: 'owner', branchId: null }, process.env.JWT_SECRET!, { expiresIn: '1h' });

    const item = await prisma.menuItem.create({
      data: { branchId, name: 'Int Item', price: 1500, category: 'test', allergens: [] },
    });
    menuItemId = item.id;
  });

  afterAll(async () => {
    await prisma.transaction.deleteMany({ where: { branchId } });
    await prisma.orderItem.deleteMany({ where: { order: { branchId } } });
    await prisma.order.deleteMany({ where: { branchId } });
    await prisma.menuItem.deleteMany({ where: { branchId } });
    await prisma.user.deleteMany({ where: { id: { in: [cashierId, ownerId] } } });
    await prisma.branch.delete({ where: { id: branchId } });
    await prisma.$disconnect();
  });

  it('creates order → adds item → processes payment → transaction recorded', async () => {
    // 1. Create order
    const orderRes = await request(app)
      .post('/api/v1/pos/orders')
      .set('Authorization', `Bearer ${cashierToken}`)
      .send({ branchId, isTakeaway: true });
    expect(orderRes.status).toBe(201);
    orderId = orderRes.body.data.id;

    // 2. Add item
    const updateRes = await request(app)
      .put(`/api/v1/pos/orders/${orderId}`)
      .set('Authorization', `Bearer ${cashierToken}`)
      .send({ items: [{ menuItemId, quantity: 1 }] });
    expect(updateRes.status).toBe(200);

    // 3. Process payment
    const payRes = await request(app)
      .post(`/api/v1/pos/orders/${orderId}/payment`)
      .set('Authorization', `Bearer ${cashierToken}`)
      .send({ paymentMethod: 'cash', cashGiven: 2000 });
    expect(payRes.status).toBe(200);
    expect(payRes.body.data.change).toBe(500);

    // 4. Verify transaction recorded
    const tx = await prisma.transaction.findFirst({ where: { orderId } });
    expect(tx).not.toBeNull();
    expect(tx!.amount).toBe(1500);
    expect(tx!.branchId).toBe(branchId);
  });

  it('owner can see the transaction via finance API', async () => {
    const res = await request(app)
      .get('/api/v1/finance/transactions')
      .set('Authorization', `Bearer ${ownerToken}`)
      .query({ branchId });

    expect(res.status).toBe(200);
    const txs: Array<{ orderId: string }> = res.body.data.items;
    expect(txs.some(t => t.orderId === orderId)).toBe(true);
  });
});

// ── RBAC: manager 403 on finance and dashboard ────────────────────────────────
describe('RBAC — finance and dashboard blocked for manager', () => {
  let managerToken: string;
  let managerId: string;
  let branchId: string;

  beforeAll(async () => {
    const branch = await prisma.branch.create({
      data: { name: 'RBAC Branch', address: 'Addr', city: 'City', phone: '000', email: 'rbac@test.nl' },
    });
    branchId = branch.id;

    const manager = await prisma.user.create({
      data: { email: 'manager-rbac@test.nl', passwordHash: 'x', role: 'manager', branchId },
    });
    managerId = manager.id;
    managerToken = jwt.sign({ sub: manager.id, email: manager.email, role: 'manager', branchId }, process.env.JWT_SECRET!, { expiresIn: '1h' });
  });

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { id: managerId } });
    await prisma.branch.delete({ where: { id: branchId } });
    await prisma.$disconnect();
  });

  const financeRoutes = [
    '/api/v1/finance/dashboard',
    '/api/v1/finance/transactions',
  ];

  const dashboardRoutes = [
    '/api/v1/dashboard/kpis',
    '/api/v1/dashboard/alerts',
    '/api/v1/dashboard/orders/recent',
  ];

  financeRoutes.forEach(route => {
    it(`manager gets 403 on GET ${route}`, async () => {
      const res = await request(app).get(route).set('Authorization', `Bearer ${managerToken}`);
      expect(res.status).toBe(403);
    });
  });

  dashboardRoutes.forEach(route => {
    it(`manager gets 403 on GET ${route}`, async () => {
      const res = await request(app).get(route).set('Authorization', `Bearer ${managerToken}`);
      expect(res.status).toBe(403);
    });
  });
});
