import { z } from 'zod';

export const transactionFilterSchema = z.object({
  branchId: z.string().uuid().optional(),
  dateFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  dateTo: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  paymentMethod: z.enum(['cash', 'pin', 'credit_card', 'online']).optional(),
  cashierId: z.string().uuid().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(200).default(20),
});

export const periodSchema = z.object({
  branchId: z.string().uuid(),
  periodStart: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  periodEnd: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

export const exportQuerySchema = z.object({
  format: z.enum(['csv', 'pdf']).default('csv'),
  branchId: z.string().uuid().optional(),
  dateFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  dateTo: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

export const payrollQuerySchema = z.object({
  branchId: z.string().uuid().optional(),
  period_start: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  period_end: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

export type TransactionFilter = z.infer<typeof transactionFilterSchema>;
export type PeriodInput = z.infer<typeof periodSchema>;
export type ExportQuery = z.infer<typeof exportQuerySchema>;
export type PayrollQuery = z.infer<typeof payrollQuerySchema>;
