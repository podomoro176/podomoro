import { z } from 'zod';

export const logWasteSchema = z.object({
  branchId: z.string().uuid(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  itemName: z.string().min(1).max(100),
  quantity: z.number().positive(),
  unit: z.string().min(1).max(20),
  reason: z.enum(['expired', 'dropped', 'overproduced', 'quality_fail', 'other']),
});

export const updateCostSchema = z.object({
  costPrice: z.number().int().positive(),
});

export type LogWasteInput = z.infer<typeof logWasteSchema>;
export type UpdateCostInput = z.infer<typeof updateCostSchema>;
