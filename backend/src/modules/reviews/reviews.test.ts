import request from 'supertest';
import app from '../../app';
import prisma from '../../lib/prisma';
import jwt from 'jsonwebtoken';

process.env.JWT_SECRET = 'test-secret';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret';
process.env.FRONTEND_URL = 'http://localhost:5173';
process.env.OWNER_EMAIL = 'owner@test.nl';

jest.mock('../../lib/socket', () => ({
  emitToRoom: jest.fn(),
  getIO: jest.fn(),
  initSocket: jest.fn(),
}));

jest.mock('../../lib/mailer', () => ({
  sendMail: jest.fn().mockResolvedValue(undefined),
}));

describe('Reviews', () => {
  let branchId: string;
  let ownerToken: string;
  let ownerId: string;

  beforeAll(async () => {
    const branch = await prisma.branch.create({
      data: { name: 'Reviews Test Branch', address: 'Addr', city: 'City', phone: '000', email: 'reviews@test.nl' },
    });
    branchId = branch.id;

    const owner = await prisma.user.create({
      data: { email: 'owner-reviews@test.nl', passwordHash: 'x', role: 'owner', branchId: null },
    });
    ownerId = owner.id;
    ownerToken = jwt.sign({ sub: owner.id, email: owner.email, role: 'owner', branchId: null }, process.env.JWT_SECRET!, { expiresIn: '1h' });
  });

  afterAll(async () => {
    await prisma.reviewScore.deleteMany({ where: { branchId } });
    await prisma.user.deleteMany({ where: { id: ownerId } });
    await prisma.branch.delete({ where: { id: branchId } });
    await prisma.$disconnect();
  });

  it('POST /api/v1/reviews — score >= 4.0 does NOT trigger alert email', async () => {
    const { sendMail } = require('../../lib/mailer');
    sendMail.mockClear();

    const res = await request(app)
      .post('/api/v1/reviews')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ branchId, score: 4.5, reviewCount: 120, source: 'manual' });

    expect(res.status).toBe(201);
    expect(res.body.data.color).toBe('green');
    expect(sendMail).not.toHaveBeenCalled();
  });

  it('POST /api/v1/reviews — score < 4.0 triggers alert email', async () => {
    const { sendMail } = require('../../lib/mailer');
    sendMail.mockClear();

    const res = await request(app)
      .post('/api/v1/reviews')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ branchId, score: 3.8, reviewCount: 5, source: 'manual' });

    expect(res.status).toBe(201);
    expect(res.body.data.color).toBe('red');
    expect(sendMail).toHaveBeenCalledWith(
      'owner@test.nl',
      expect.stringContaining('Score alert'),
      expect.any(String),
    );
  });

  it('GET /api/v1/reviews — returns branches with scores and history', async () => {
    const res = await request(app)
      .get('/api/v1/reviews')
      .set('Authorization', `Bearer ${ownerToken}`)
      .query({ branchId });

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
    const entry = res.body.data[0];
    expect(entry).toHaveProperty('currentScore');
    expect(entry).toHaveProperty('color');
    expect(Array.isArray(entry.history)).toBe(true);
  });
});
