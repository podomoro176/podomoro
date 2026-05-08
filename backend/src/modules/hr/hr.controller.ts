import { Request, Response, NextFunction } from 'express';
import {
  createEmployeeSchema, updateEmployeeSchema, createShiftSchema,
  createLeaveSchema, reviewLeaveSchema, availabilitySchema,
} from './hr.schema';
import * as service from './hr.service';

function handle(fn: () => Promise<unknown>) {
  return async (_req: Request, res: Response, next: NextFunction) => {
    try { res.json({ success: true, data: await fn() }); }
    catch (err: any) {
      if (err.statusCode) return res.status(err.statusCode).json({ success: false, error: err.message });
      next(err);
    }
  };
}

// ── Employees ─────────────────────────────────────────────────────────────────
export async function listEmployees(req: Request, res: Response, next: NextFunction) {
  try {
    const branchId = req.user!.role === 'owner' ? null : req.user!.branchId;
    res.json({ success: true, data: await service.listEmployees(branchId) });
  } catch (err) { next(err); }
}

export async function getEmployee(req: Request, res: Response, next: NextFunction) {
  try {
    const emp = await service.getEmployee(req.params.id as string);
    if (!emp) return res.status(404).json({ success: false, error: 'Employee not found' });
    res.json({ success: true, data: emp });
  } catch (err) { next(err); }
}

export async function createEmployee(req: Request, res: Response, next: NextFunction) {
  try {
    const parsed = createEmployeeSchema.safeParse(req.body);
    if (!parsed.success) return res.status(422).json({ success: false, error: parsed.error.flatten() });
    res.status(201).json({ success: true, data: await service.createEmployee(parsed.data) });
  } catch (err) { next(err); }
}

export async function updateEmployee(req: Request, res: Response, next: NextFunction) {
  try {
    const parsed = updateEmployeeSchema.safeParse(req.body);
    if (!parsed.success) return res.status(422).json({ success: false, error: parsed.error.flatten() });
    res.json({ success: true, data: await service.updateEmployee(req.params.id as string, parsed.data) });
  } catch (err) { next(err); }
}

export async function deleteEmployee(req: Request, res: Response, next: NextFunction) {
  try {
    await service.deleteEmployee(req.params.id as string);
    res.json({ success: true, data: null });
  } catch (err) { next(err); }
}

// ── Schedule ──────────────────────────────────────────────────────────────────
export async function getSchedule(req: Request, res: Response, next: NextFunction) {
  try {
    const branchId = (req.query.branchId as string) || req.user!.branchId!;
    const week = req.query.week as string || currentWeek();
    res.json({ success: true, data: await service.getWeeklySchedule(branchId, week) });
  } catch (err) { next(err); }
}

export async function createShift(req: Request, res: Response, next: NextFunction) {
  try {
    const parsed = createShiftSchema.safeParse(req.body);
    if (!parsed.success) return res.status(422).json({ success: false, error: parsed.error.flatten() });
    res.status(201).json({ success: true, data: await service.createShift(parsed.data) });
  } catch (err) { next(err); }
}

export async function getMyShifts(req: Request, res: Response, next: NextFunction) {
  try {
    const emp = await import('../../lib/prisma').then(m => m.default.employee.findUnique({ where: { userId: req.user!.id } }));
    if (!emp) return res.status(404).json({ success: false, error: 'Employee record not found' });
    res.json({ success: true, data: await service.getMyShifts(emp.id) });
  } catch (err) { next(err); }
}

// ── Attendance ────────────────────────────────────────────────────────────────
export async function clockIn(req: Request, res: Response, next: NextFunction) {
  try {
    const emp = await import('../../lib/prisma').then(m => m.default.employee.findUnique({ where: { userId: req.user!.id } }));
    if (!emp) return res.status(404).json({ success: false, error: 'Employee record not found' });
    res.status(201).json({ success: true, data: await service.clockIn(emp.id, emp.branchId) });
  } catch (err: any) {
    if (err.statusCode) return res.status(err.statusCode).json({ success: false, error: err.message });
    next(err);
  }
}

export async function clockOut(req: Request, res: Response, next: NextFunction) {
  try {
    const emp = await import('../../lib/prisma').then(m => m.default.employee.findUnique({ where: { userId: req.user!.id } }));
    if (!emp) return res.status(404).json({ success: false, error: 'Employee record not found' });
    res.json({ success: true, data: await service.clockOut(emp.id) });
  } catch (err: any) {
    if (err.statusCode) return res.status(err.statusCode).json({ success: false, error: err.message });
    next(err);
  }
}

export async function getVariance(req: Request, res: Response, next: NextFunction) {
  try {
    const branchId = (req.query.branchId as string) || req.user!.branchId!;
    const week = req.query.week as string || currentWeek();
    res.json({ success: true, data: await service.getAttendanceVariance(branchId, week) });
  } catch (err) { next(err); }
}

// ── Leave ─────────────────────────────────────────────────────────────────────
export async function submitLeave(req: Request, res: Response, next: NextFunction) {
  try {
    const parsed = createLeaveSchema.safeParse(req.body);
    if (!parsed.success) return res.status(422).json({ success: false, error: parsed.error.flatten() });
    const emp = await import('../../lib/prisma').then(m => m.default.employee.findUnique({ where: { userId: req.user!.id } }));
    if (!emp) return res.status(404).json({ success: false, error: 'Employee record not found' });
    res.status(201).json({ success: true, data: await service.submitLeave(emp.id, emp.branchId, parsed.data) });
  } catch (err) { next(err); }
}

export async function reviewLeave(req: Request, res: Response, next: NextFunction) {
  try {
    const parsed = reviewLeaveSchema.safeParse(req.body);
    if (!parsed.success) return res.status(422).json({ success: false, error: parsed.error.flatten() });
    res.json({ success: true, data: await service.reviewLeave(req.params.id as string, parsed.data, req.user!.id) });
  } catch (err: any) {
    if (err.statusCode) return res.status(err.statusCode).json({ success: false, error: err.message });
    next(err);
  }
}

// ── Availability ──────────────────────────────────────────────────────────────
export async function submitAvailability(req: Request, res: Response, next: NextFunction) {
  try {
    const parsed = availabilitySchema.safeParse(req.body);
    if (!parsed.success) return res.status(422).json({ success: false, error: parsed.error.flatten() });
    const emp = await import('../../lib/prisma').then(m => m.default.employee.findUnique({ where: { userId: req.user!.id } }));
    if (!emp) return res.status(404).json({ success: false, error: 'Employee record not found' });
    res.status(201).json({ success: true, data: await service.submitAvailability(emp.id, parsed.data.date, parsed.data.isUnavailable, parsed.data.reason) });
  } catch (err) { next(err); }
}

export async function listAvailability(req: Request, res: Response, next: NextFunction) {
  try {
    const branchId = (req.query.branchId as string) || req.user!.branchId!;
    res.json({ success: true, data: await service.listAvailability(branchId) });
  } catch (err) { next(err); }
}

function currentWeek(): string {
  const now = new Date();
  const jan4 = new Date(now.getFullYear(), 0, 4);
  const weekNum = Math.ceil(((now.getTime() - jan4.getTime()) / 86_400_000 + jan4.getDay() + 1) / 7);
  return `${now.getFullYear()}-W${String(weekNum).padStart(2, '0')}`;
}
