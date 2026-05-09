import prisma from '../../lib/prisma';
import { sendMail } from '../../lib/mailer';
import {
  CreateEmployeeInput, UpdateEmployeeInput, CreateShiftInput,
  CreateLeaveInput, ReviewLeaveInput,
} from './hr.schema';
import { Decimal } from '@prisma/client/runtime/library';

// ── Employees ─────────────────────────────────────────────────────────────────

export async function listEmployees(branchId: string | null) {
  return prisma.employee.findMany({
    where: branchId ? { branchId } : undefined,
    include: { user: { select: { email: true, role: true } } },
    orderBy: { name: 'asc' },
  });
}

export async function getEmployee(id: string) {
  return prisma.employee.findUnique({ where: { id }, include: { user: true } });
}

export async function createEmployee(data: CreateEmployeeInput) {
  return prisma.employee.create({
    data: { ...data, startDate: new Date(data.startDate) },
    include: { user: true },
  });
}

export async function updateEmployee(id: string, data: UpdateEmployeeInput) {
  return prisma.employee.update({
    where: { id },
    data: { ...data, ...(data.startDate && { startDate: new Date(data.startDate) }) },
  });
}

export async function deleteEmployee(id: string) {
  return prisma.employee.delete({ where: { id } });
}

// ── Schedule ──────────────────────────────────────────────────────────────────

export async function getWeeklySchedule(branchId: string, week: string) {
  // week format: YYYY-Www — convert to Mon–Sun date range
  const [year, weekNum] = week.split('-W').map(Number);
  const jan4 = new Date(year, 0, 4);
  const weekStart = new Date(jan4);
  weekStart.setDate(jan4.getDate() - ((jan4.getDay() + 6) % 7) + (weekNum - 1) * 7);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);

  return prisma.shift.findMany({
    where: { branchId, date: { gte: weekStart, lte: weekEnd } },
    include: { employee: { select: { name: true, role: true } } },
    orderBy: [{ date: 'asc' }, { startTime: 'asc' }],
  });
}

export async function createShift(data: CreateShiftInput) {
  return prisma.shift.create({
    data: {
      branchId: data.branchId,
      employeeId: data.employeeId,
      date: new Date(data.date),
      startTime: new Date(`1970-01-01T${data.startTime}:00Z`),
      endTime: new Date(`1970-01-01T${data.endTime}:00Z`),
      roleOnShift: data.roleOnShift,
    },
  });
}

export async function getMyShifts(employeeId: string) {
  return prisma.shift.findMany({
    where: { employeeId, date: { gte: new Date() } },
    orderBy: { date: 'asc' },
  });
}

// ── Attendance ────────────────────────────────────────────────────────────────

export async function clockIn(employeeId: string, branchId: string) {
  const active = await prisma.attendance.findFirst({
    where: { employeeId, clockOut: null },
  });
  if (active) throw Object.assign(new Error('Already clocked in'), { statusCode: 409 });

  const todayShift = await prisma.shift.findFirst({
    where: { employeeId, date: { gte: startOfDay(new Date()), lte: endOfDay(new Date()) } },
  });

  return prisma.attendance.create({
    data: {
      branchId,
      employeeId,
      shiftId: todayShift?.id,
      clockIn: new Date(),
      scheduledHours: todayShift ? shiftHours(todayShift.startTime, todayShift.endTime) : new Decimal(0),
      actualHours: new Decimal(0),
    },
  });
}

export async function clockOut(employeeId: string) {
  const record = await prisma.attendance.findFirst({ where: { employeeId, clockOut: null } });
  if (!record) throw Object.assign(new Error('Not clocked in'), { statusCode: 409 });

  const now = new Date();
  const actualHours = new Decimal((now.getTime() - record.clockIn.getTime()) / 3_600_000).toDecimalPlaces(2);

  return prisma.attendance.update({
    where: { id: record.id },
    data: { clockOut: now, actualHours },
  });
}

export function calculateVariance(attendance: Array<{ scheduledHours: Decimal; actualHours: Decimal; employee: { name: string } }>) {
  return attendance.map(a => ({
    employeeName: a.employee.name,
    scheduledHours: Number(a.scheduledHours),
    actualHours: Number(a.actualHours),
    variance: Number(a.actualHours) - Number(a.scheduledHours),
  }));
}

export async function getAttendanceVariance(branchId: string, week: string) {
  const [year, weekNum] = week.split('-W').map(Number);
  const jan4 = new Date(year, 0, 4);
  const weekStart = new Date(jan4);
  weekStart.setDate(jan4.getDate() - ((jan4.getDay() + 6) % 7) + (weekNum - 1) * 7);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);

  const records = await prisma.attendance.findMany({
    where: { branchId, clockIn: { gte: weekStart, lte: weekEnd } },
    include: { employee: { select: { name: true } } },
  });

  return calculateVariance(records);
}

// ── Leave requests ────────────────────────────────────────────────────────────

export async function submitLeave(employeeId: string, branchId: string, data: CreateLeaveInput) {
  return prisma.leaveRequest.create({
    data: {
      employeeId,
      branchId,
      type: data.type,
      startDate: new Date(data.startDate),
      endDate: new Date(data.endDate),
      reason: data.reason,
    },
  });
}

export async function reviewLeave(id: string, data: ReviewLeaveInput, reviewerId: string) {
  const leave = await prisma.leaveRequest.findUnique({
    where: { id },
    include: { employee: { include: { user: true } } },
  });
  if (!leave) throw Object.assign(new Error('Leave request not found'), { statusCode: 404 });

  const updated = await prisma.leaveRequest.update({
    where: { id },
    data: { status: data.status, reviewedBy: reviewerId, reviewedAt: new Date() },
  });

  const statusNL = data.status === 'approved' ? 'goedgekeurd' : 'afgewezen';
  sendMail(
    leave.employee.user.email,
    `Verlofaanvraag ${statusNL}`,
    `<p>Uw verlofaanvraag van ${leave.startDate.toLocaleDateString('nl-NL')} t/m ${leave.endDate.toLocaleDateString('nl-NL')} is <strong>${statusNL}</strong>.</p>`,
  ).catch((err) => console.error('[hr] leave email failed:', err.message));

  return updated;
}

// ── Availability ──────────────────────────────────────────────────────────────

export async function submitAvailability(employeeId: string, date: string, isUnavailable: boolean, reason?: string) {
  return prisma.availability.create({
    data: { employeeId, date: new Date(date), isUnavailable, reason },
  });
}

export async function listAvailability(branchId: string) {
  return prisma.availability.findMany({
    where: { employee: { branchId } },
    include: { employee: { select: { name: true } } },
    orderBy: { date: 'asc' },
  });
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
}

function endOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);
}

function shiftHours(start: Date, end: Date): Decimal {
  return new Decimal((end.getTime() - start.getTime()) / 3_600_000).toDecimalPlaces(2);
}
