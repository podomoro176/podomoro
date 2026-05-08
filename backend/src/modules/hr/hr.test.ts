import { calculateVariance } from './hr.service';
import { Decimal } from '@prisma/client/runtime/library';
import request from 'supertest';
import app from '../../app';
import prisma from '../../lib/prisma';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

process.env.JWT_SECRET = 'test-secret';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret';
process.env.FRONTEND_URL = 'http://localhost:5173';

jest.mock('../../lib/mailer', () => ({ sendMail: jest.fn().mockResolvedValue(undefined) }));

// ── Unit: hours variance ──────────────────────────────────────────────────────
describe('Hours variance calculation (unit)', () => {
  it('calculates positive variance (worked more than scheduled)', () => {
    const records = [
      { scheduledHours: new Decimal(8), actualHours: new Decimal(9.5), employee: { name: 'Jan' } },
      { scheduledHours: new Decimal(6), actualHours: new Decimal(5), employee: { name: 'Piet' } },
    ];
    const result = calculateVariance(records);
    expect(result[0].variance).toBeCloseTo(1.5);
    expect(result[1].variance).toBeCloseTo(-1);
  });

  it('returns zero variance when hours match', () => {
    const records = [{ scheduledHours: new Decimal(8), actualHours: new Decimal(8), employee: { name: 'Marie' } }];
    expect(calculateVariance(records)[0].variance).toBe(0);
  });
});

// ── Integration: leave request → approval → email ─────────────────────────────
describe('Leave request flow (integration)', () => {
  let branchId: string;
  let managerToken: string;
  let managerId: string;
  let staffUserId: string;
  let staffToken: string;
  let staffEmployeeId: string;
  let leaveId: string;

  beforeAll(async () => {
    const branch = await prisma.branch.create({
      data: { name: 'HR Test Branch', address: 'Addr', city: 'City', phone: '000', email: 'hr@test.nl' },
    });
    branchId = branch.id;

    const mgr = await prisma.user.create({
      data: { email: 'hr-manager@test.nl', passwordHash: await bcrypt.hash('pass', 12), role: 'manager', branchId },
    });
    managerId = mgr.id;
    managerToken = jwt.sign({ sub: mgr.id, email: mgr.email, role: 'manager', branchId }, process.env.JWT_SECRET!, { expiresIn: '1h' });

    const staff = await prisma.user.create({
      data: { email: 'hr-staff@test.nl', passwordHash: await bcrypt.hash('pass', 12), role: 'staff', branchId },
    });
    staffUserId = staff.id;
    staffToken = jwt.sign({ sub: staff.id, email: staff.email, role: 'staff', branchId }, process.env.JWT_SECRET!, { expiresIn: '1h' });

    const emp = await prisma.employee.create({
      data: {
        branchId, userId: staffUserId, name: 'Test Staff', role: 'ober',
        contractType: 'parttime', hourlyRate: 1200, startDate: new Date('2024-01-01'),
      },
    });
    staffEmployeeId = emp.id;
  });

  afterAll(async () => {
    await prisma.leaveRequest.deleteMany({ where: { employeeId: staffEmployeeId } });
    await prisma.employee.delete({ where: { id: staffEmployeeId } });
    await prisma.user.deleteMany({ where: { id: { in: [managerId, staffUserId] } } });
    await prisma.branch.delete({ where: { id: branchId } });
    await prisma.$disconnect();
  });

  it('staff submits a leave request', async () => {
    const res = await request(app)
      .post('/api/v1/hr/leave')
      .set('Authorization', `Bearer ${staffToken}`)
      .send({ type: 'vakantie', startDate: '2026-08-01', endDate: '2026-08-07', reason: 'Zomervakantie' });

    expect(res.status).toBe(201);
    expect(res.body.data.status).toBe('pending');
    leaveId = res.body.data.id;
  });

  it('manager approves leave and email is sent', async () => {
    const { sendMail } = require('../../lib/mailer');
    const res = await request(app)
      .put(`/api/v1/hr/leave/${leaveId}`)
      .set('Authorization', `Bearer ${managerToken}`)
      .send({ status: 'approved' });

    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('approved');
    expect(sendMail).toHaveBeenCalledWith(
      'hr-staff@test.nl',
      expect.stringContaining('goedgekeurd'),
      expect.any(String),
    );
  });
});
