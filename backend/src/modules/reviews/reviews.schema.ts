import { z } from 'zod';

export const createReviewSchema = z.object({
  branchId: z.string().uuid(),
  score: z.number().min(1).max(5),
  reviewCount: z.number().int().nonnegative().optional(),
  source: z.enum(['manual', 'google_api']).default('manual'),
});

export type CreateReviewInput = z.infer<typeof createReviewSchema>;
