import request from 'supertest';
import bcrypt from 'bcryptjs';
import app from '../../app';
import prisma from '../../lib/prisma';

process.env.JWT_SECRET = 'test-secret';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret';
process.env.FRONTEND_URL = 'http://localhost:5173';

const TEST_EMAIL = 'auth-test@podomoro.nl';
const TEST_PASSWORD = 'TestPass@1234';

describe('Auth API', () => {
  let testUserId: string;
  let refreshToken: string;

  beforeAll(async () => {
    await prisma.user.deleteMany({ where: { email: TEST_EMAIL } });
    const user = await prisma.user.create({
      data: {
        email: TEST_EMAIL,
        passwordHash: await bcrypt.hash(TEST_PASSWORD, 12),
        role: 'manager',
        branchId: null,
      },
    });
    testUserId = user.id;
  });

  afterAll(async () => {
    await prisma.session.deleteMany({ where: { userId: testUserId } });
    await prisma.user.deleteMany({ where: { id: testUserId } });
    await prisma.$disconnect();
  });

  it('POST /api/v1/auth/login — returns tokens on valid credentials', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: TEST_EMAIL, password: TEST_PASSWORD });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.accessToken).toBeDefined();
    expect(res.body.data.refreshToken).toBeDefined();
    refreshToken = res.body.data.refreshToken;
  });

  it('POST /api/v1/auth/login — returns 401 on wrong password', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: TEST_EMAIL, password: 'wrong' });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('POST /api/v1/auth/login — locks account after 5 failed attempts', async () => {
    // Reset the counter first
    await prisma.user.update({
      where: { id: testUserId },
      data: { failedAttempts: 0, lockedUntil: null },
    });

    for (let i = 0; i < 5; i++) {
      await request(app)
        .post('/api/v1/auth/login')
        .send({ email: TEST_EMAIL, password: 'wrongpass' });
    }

    // Even with correct password, locked now
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: TEST_EMAIL, password: TEST_PASSWORD });

    expect(res.status).toBe(423);

    // Unlock for remaining tests
    await prisma.user.update({
      where: { id: testUserId },
      data: { failedAttempts: 0, lockedUntil: null },
    });
  });

  it('POST /api/v1/auth/refresh — returns new access token', async () => {
    const res = await request(app)
      .post('/api/v1/auth/refresh')
      .send({ refreshToken });

    expect(res.status).toBe(200);
    expect(res.body.data.accessToken).toBeDefined();
  });

  it('GET /api/v1/auth/me — returns user with valid token', async () => {
    const loginRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: TEST_EMAIL, password: TEST_PASSWORD });

    const token = loginRes.body.data.accessToken;

    const res = await request(app)
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.data.email).toBe(TEST_EMAIL);
  });

  it('GET /api/v1/auth/me — returns 401 without token', async () => {
    const res = await request(app).get('/api/v1/auth/me');
    expect(res.status).toBe(401);
  });

  it('GET /api/v1/branches — returns 403 for manager role', async () => {
    const loginRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: TEST_EMAIL, password: TEST_PASSWORD });

    const token = loginRes.body.data.accessToken;

    const res = await request(app)
      .get('/api/v1/branches')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(403);
  });
});
