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

describe('Dashboard RBAC', () => {
  let ownerToken: string;
  let managerToken: string;
  let ownerId: string;
  let managerId: string;
  let branchId: string;

  beforeAll(async () => {
    const branch = await prisma.branch.create({
      data: { name: 'Dashboard Test Branch', address: 'Addr', city: 'City', phone: '000', email: 'dashboard@test.nl' },
    });
    branchId = branch.id;

    const owner = await prisma.user.create({
      data: { email: 'owner-dash@test.nl', passwordHash: 'x', role: 'owner', branchId: null },
    });
    ownerId = owner.id;
    ownerToken = jwt.sign({ sub: owner.id, email: owner.email, role: 'owner', branchId: null }, process.env.JWT_SECRET!, { expiresIn: '1h' });

    const manager = await prisma.user.create({
      data: { email: 'manager-dash@test.nl', passwordHash: 'x', role: 'manager', branchId },
    });
    managerId = manager.id;
    managerToken = jwt.sign({ sub: manager.id, email: manager.email, role: 'manager', branchId }, process.env.JWT_SECRET!, { expiresIn: '1h' });
  });

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { id: { in: [ownerId, managerId] } } });
    await prisma.branch.delete({ where: { id: branchId } });
    await prisma.$disconnect();
  });

  it('manager gets 403 on /dashboard/kpis', async () => {
    const res = await request(app)
      .get('/api/v1/dashboard/kpis')
      .set('Authorization', `Bearer ${managerToken}`);
    expect(res.status).toBe(403);
  });

  it('manager gets 403 on /dashboard/alerts', async () => {
    const res = await request(app)
      .get('/api/v1/dashboard/alerts')
      .set('Authorization', `Bearer ${managerToken}`);
    expect(res.status).toBe(403);
  });

  it('owner can access /dashboard/kpis', async () => {
    const res = await request(app)
      .get('/api/v1/dashboard/kpis')
      .set('Authorization', `Bearer ${ownerToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveProperty('revenueToday');
    expect(res.body.data).toHaveProperty('openOrders');
  });

  it('owner can access /dashboard/revenue', async () => {
    const res = await request(app)
      .get('/api/v1/dashboard/revenue')
      .set('Authorization', `Bearer ${ownerToken}`)
      .query({ days: 7 });
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  it('owner can access /dashboard/orders/recent', async () => {
    const res = await request(app)
      .get('/api/v1/dashboard/orders/recent')
      .set('Authorization', `Bearer ${ownerToken}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
  });
});
