import request from 'supertest';
import app from '../../app';
import prisma from '../../lib/prisma';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

process.env.JWT_SECRET = 'test-secret';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret';
process.env.FRONTEND_URL = 'http://localhost:5173';

function ownerToken() {
  return jwt.sign(
    { sub: 'test-owner-id', email: 'test@owner.com', role: 'owner', branchId: null },
    process.env.JWT_SECRET!,
    { expiresIn: '1h' }
  );
}

function managerToken(branchId: string) {
  return jwt.sign(
    { sub: 'test-manager-id', email: 'test@manager.com', role: 'manager', branchId },
    process.env.JWT_SECRET!,
    { expiresIn: '1h' }
  );
}

describe('Branches API', () => {
  let createdBranchId: string;

  afterAll(async () => {
    if (createdBranchId) {
      await prisma.branch.deleteMany({ where: { id: createdBranchId } });
    }
    await prisma.$disconnect();
  });

  it('POST /api/v1/branches — creates a branch (owner)', async () => {
    const res = await request(app)
      .post('/api/v1/branches')
      .set('Authorization', `Bearer ${ownerToken()}`)
      .send({
        name: 'Test Branch',
        address: 'Teststraat 1',
        city: 'Teststad',
        phone: '010-0000000',
        email: 'test@podomoro.nl',
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.name).toBe('Test Branch');
    createdBranchId = res.body.data.id;
  });

  it('GET /api/v1/branches/:id — fetches the branch (owner)', async () => {
    const res = await request(app)
      .get(`/api/v1/branches/${createdBranchId}`)
      .set('Authorization', `Bearer ${ownerToken()}`);

    expect(res.status).toBe(200);
    expect(res.body.data.id).toBe(createdBranchId);
  });

  it('PUT /api/v1/branches/:id — updates the branch (owner)', async () => {
    const res = await request(app)
      .put(`/api/v1/branches/${createdBranchId}`)
      .set('Authorization', `Bearer ${ownerToken()}`)
      .send({ city: 'Nieuwstad' });

    expect(res.status).toBe(200);
    expect(res.body.data.city).toBe('Nieuwstad');
  });

  it('DELETE /api/v1/branches/:id — soft-deletes branch (owner)', async () => {
    const res = await request(app)
      .delete(`/api/v1/branches/${createdBranchId}`)
      .set('Authorization', `Bearer ${ownerToken()}`);

    expect(res.status).toBe(200);
    expect(res.body.data.isActive).toBe(false);
  });

  it('GET /api/v1/branches — returns 403 for manager', async () => {
    const res = await request(app)
      .get('/api/v1/branches')
      .set('Authorization', `Bearer ${managerToken('some-branch-id')}`);

    expect(res.status).toBe(403);
  });
});
