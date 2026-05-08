import request from 'supertest';
import app from '../../app';
import prisma from '../../lib/prisma';
import jwt from 'jsonwebtoken';

process.env.JWT_SECRET = 'test-secret';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret';
process.env.FRONTEND_URL = 'http://localhost:5173';

function managerToken(branchId: string) {
  return jwt.sign(
    { sub: 'test-manager-id', email: 'test@manager.com', role: 'manager', branchId },
    process.env.JWT_SECRET!,
    { expiresIn: '1h' }
  );
}

describe('Menu API', () => {
  let testBranchId: string;
  let createdItemId: string;

  beforeAll(async () => {
    const branch = await prisma.branch.create({
      data: {
        name: 'Menu Test Branch',
        address: 'Teststraat 99',
        city: 'Teststad',
        phone: '000-0000000',
        email: 'menutest@podomoro.nl',
      },
    });
    testBranchId = branch.id;
  });

  afterAll(async () => {
    if (createdItemId) await prisma.menuItem.deleteMany({ where: { id: createdItemId } });
    await prisma.branch.deleteMany({ where: { id: testBranchId } });
    await prisma.$disconnect();
  });

  it('GET /api/v1/menu — returns items unauthenticated', async () => {
    const res = await request(app).get('/api/v1/menu');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data.items)).toBe(true);
  });

  it('POST /api/v1/menu — creates item with allergens (manager)', async () => {
    const res = await request(app)
      .post('/api/v1/menu')
      .set('Authorization', `Bearer ${managerToken(testBranchId)}`)
      .send({
        branchId: testBranchId,
        name: 'Test Gerecht',
        price: 1200,
        category: 'test',
        allergens: ['gluten', 'melk'],
      });

    expect(res.status).toBe(201);
    expect(res.body.data.allergens).toEqual(['gluten', 'melk']);
    createdItemId = res.body.data.id;
  });

  it('GET /api/v1/menu/:id — returns item with allergens array', async () => {
    const res = await request(app).get(`/api/v1/menu/${createdItemId}`);
    expect(res.status).toBe(200);
    expect(res.body.data.allergens).toContain('gluten');
  });

  it('DELETE /api/v1/menu/:id — soft-deletes item (manager)', async () => {
    const res = await request(app)
      .delete(`/api/v1/menu/${createdItemId}`)
      .set('Authorization', `Bearer ${managerToken(testBranchId)}`);

    expect(res.status).toBe(200);
    expect(res.body.data.isAvailable).toBe(false);
  });

  it('POST /api/v1/menu — returns 403 for cashier role', async () => {
    const token = jwt.sign(
      { sub: 'id', email: 'e@e.nl', role: 'cashier', branchId: testBranchId },
      process.env.JWT_SECRET!,
      { expiresIn: '1h' }
    );
    const res = await request(app)
      .post('/api/v1/menu')
      .set('Authorization', `Bearer ${token}`)
      .send({ branchId: testBranchId, name: 'x', price: 100, category: 'x', allergens: [] });

    expect(res.status).toBe(403);
  });
});
