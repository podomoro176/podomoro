import { z } from 'zod';

export const createEmployeeSchema = z.object({
  branchId: z.string().uuid(),
  userId: z.string().uuid(),
  name: z.string().min(1),
  role: z.string().min(1),
  contractType: z.enum(['fulltime', 'parttime', 'oproep']),
  hourlyRate: z.number().int().positive(),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  emergencyContactName: z.string().optional(),
  emergencyContactPhone: z.string().optional(),
});

export const updateEmployeeSchema = createEmployeeSchema.partial().omit({ branchId: true, userId: true });

export const createShiftSchema = z.object({
  branchId: z.string().uuid(),
  employeeId: z.string().uuid(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  startTime: z.string().regex(/^\d{2}:\d{2}$/),
  endTime: z.string().regex(/^\d{2}:\d{2}$/),
  roleOnShift: z.string().min(1),
});

export const createLeaveSchema = z.object({
  type: z.enum(['vakantie', 'ziek', 'bijzonder_verlof']),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  reason: z.string().optional(),
});

export const reviewLeaveSchema = z.object({
  status: z.enum(['approved', 'rejected']),
});

export const availabilitySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  isUnavailable: z.boolean().default(true),
  reason: z.string().optional(),
});

export type CreateEmployeeInput = z.infer<typeof createEmployeeSchema>;
export type UpdateEmployeeInput = z.infer<typeof updateEmployeeSchema>;
export type CreateShiftInput = z.infer<typeof createShiftSchema>;
export type CreateLeaveInput = z.infer<typeof createLeaveSchema>;
export type ReviewLeaveInput = z.infer<typeof reviewLeaveSchema>;
