import request from 'supertest';
import app from '../../app';
import prisma from '../../lib/prisma';
import jwt from 'jsonwebtoken';
import { calcFoodCostPercent, calcLabourCostPercent, calcGrossProfitMargin } from './finance.service';

process.env.JWT_SECRET = 'test-secret';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret';
process.env.FRONTEND_URL = 'http://localhost:5173';

jest.mock('../../lib/socket', () => ({
  emitToRoom: jest.fn(),
  getIO: jest.fn(),
  initSocket: jest.fn(),
}));

// ── Unit: KPI formulas ────────────────────────────────────────────────────────
describe('Finance KPI formulas (unit)', () => {
  it('calcFoodCostPercent: (distrib + waste) / revenue * 100', () => {
    expect(calcFoodCostPercent(2800, 200, 10000)).toBe(30);
    expect(calcFoodCostPercent(0, 0, 0)).toBe(0);
    expect(calcFoodCostPercent(1000, 500, 10000)).toBe(15);
  });

  it('calcLabourCostPercent: labour / revenue * 100', () => {
    expect(calcLabourCostPercent(3200, 10000)).toBe(32);
    expect(calcLabourCostPercent(0, 0)).toBe(0);
  });

  it('calcGrossProfitMargin: (revenue - food - waste) / revenue * 100', () => {
    expect(calcGrossProfitMargin(10000, 2800, 200)).toBe(70);
    expect(calcGrossProfitMargin(0, 0, 0)).toBe(0);
  });
});

// ── RBAC: manager gets 403 ────────────────────────────────────────────────────
describe('Finance RBAC', () => {
  let managerToken: string;
  let ownerToken: string;
  let branchId: string;
  let managerId: string;
  let ownerId: string;

  beforeAll(async () => {
    const branch = await prisma.branch.create({
      data: { name: 'Finance RBAC Branch', address: 'Addr', city: 'City', phone: '000', email: 'finance-rbac@test.nl' },
    });
    branchId = branch.id;

    const manager = await prisma.user.create({
      data: { email: 'manager-finance@test.nl', passwordHash: 'x', role: 'manager', branchId },
    });
    managerId = manager.id;
    managerToken = jwt.sign({ sub: manager.id, email: manager.email, role: 'manager', branchId }, process.env.JWT_SECRET!, { expiresIn: '1h' });

    const owner = await prisma.user.create({
      data: { email: 'owner-finance@test.nl', passwordHash: 'x', role: 'owner', branchId: null },
    });
    ownerId = owner.id;
    ownerToken = jwt.sign({ sub: owner.id, email: owner.email, role: 'owner', branchId: null }, process.env.JWT_SECRET!, { expiresIn: '1h' });
  });

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { id: { in: [managerId, ownerId] } } });
    await prisma.branch.delete({ where: { id: branchId } });
    await prisma.$disconnect();
  });

  it('manager gets 403 on /finance/dashboard', async () => {
    const res = await request(app)
      .get('/api/v1/finance/dashboard')
      .set('Authorization', `Bearer ${managerToken}`);
    expect(res.status).toBe(403);
  });

  it('manager gets 403 on /finance/transactions', async () => {
    const res = await request(app)
      .get('/api/v1/finance/transactions')
      .set('Authorization', `Bearer ${managerToken}`);
    expect(res.status).toBe(403);
  });

  it('owner can access /finance/dashboard', async () => {
    const res = await request(app)
      .get('/api/v1/finance/dashboard')
      .set('Authorization', `Bearer ${ownerToken}`);
    expect(res.status).toBe(200);
  });

  it('owner can list transactions', async () => {
    const res = await request(app)
      .get('/api/v1/finance/transactions')
      .set('Authorization', `Bearer ${ownerToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveProperty('items');
  });
});
