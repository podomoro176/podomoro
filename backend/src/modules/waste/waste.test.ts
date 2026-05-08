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

describe('Waste Log', () => {
  let branchId: string;
  let managerId: string;
  let staffId: string;
  let managerToken: string;
  let staffToken: string;
  let entryId: string;

  beforeAll(async () => {
    const branch = await prisma.branch.create({
      data: { name: 'Waste Test Branch', address: 'Addr', city: 'City', phone: '000', email: 'waste@test.nl' },
    });
    branchId = branch.id;

    const manager = await prisma.user.create({
      data: { email: 'manager-waste@test.nl', passwordHash: 'x', role: 'manager', branchId },
    });
    managerId = manager.id;
    managerToken = jwt.sign({ sub: manager.id, email: manager.email, role: 'manager', branchId }, process.env.JWT_SECRET!, { expiresIn: '1h' });

    const staff = await prisma.user.create({
      data: { email: 'staff-waste@test.nl', passwordHash: 'x', role: 'staff', branchId },
    });
    staffId = staff.id;
    staffToken = jwt.sign({ sub: staff.id, email: staff.email, role: 'staff', branchId }, process.env.JWT_SECRET!, { expiresIn: '1h' });
  });

  afterAll(async () => {
    await prisma.wasteLog.deleteMany({ where: { branchId } });
    await prisma.user.deleteMany({ where: { id: { in: [managerId, staffId] } } });
    await prisma.branch.delete({ where: { id: branchId } });
    await prisma.$disconnect();
  });

  it('POST /api/v1/waste — staff logs waste entry', async () => {
    const res = await request(app)
      .post('/api/v1/waste')
      .set('Authorization', `Bearer ${staffToken}`)
      .send({ branchId, date: '2024-01-15', itemName: 'Tomaten', quantity: 2.5, unit: 'kg', reason: 'expired' });

    expect(res.status).toBe(201);
    expect(res.body.data.itemName).toBe('Tomaten');
    entryId = res.body.data.id;
  });

  it('PUT /api/v1/waste/:id/cost — manager updates cost price', async () => {
    const res = await request(app)
      .put(`/api/v1/waste/${entryId}/cost`)
      .set('Authorization', `Bearer ${managerToken}`)
      .send({ costPrice: 350 });

    expect(res.status).toBe(200);
    expect(res.body.data.costPrice).toBe(350);
  });

  it('PUT /api/v1/waste/:id/cost — staff cannot update cost price', async () => {
    const res = await request(app)
      .put(`/api/v1/waste/${entryId}/cost`)
      .set('Authorization', `Bearer ${staffToken}`)
      .send({ costPrice: 100 });

    expect(res.status).toBe(403);
  });

  it('DELETE /api/v1/waste/:id — returns 404 (no delete route)', async () => {
    const res = await request(app)
      .delete(`/api/v1/waste/${entryId}`)
      .set('Authorization', `Bearer ${managerToken}`);

    expect(res.status).toBe(404);
  });

  it('GET /api/v1/waste — manager lists entries', async () => {
    const res = await request(app)
      .get('/api/v1/waste')
      .set('Authorization', `Bearer ${managerToken}`)
      .query({ branchId });

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data.items)).toBe(true);
    expect(res.body.data.items.length).toBeGreaterThan(0);
  });

  it('GET /api/v1/waste/totals — manager gets totals', async () => {
    const res = await request(app)
      .get('/api/v1/waste/totals')
      .set('Authorization', `Bearer ${managerToken}`)
      .query({ branchId, period: 'month' });

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveProperty('totalCost');
    expect(res.body.data).toHaveProperty('period', 'month');
  });
});
