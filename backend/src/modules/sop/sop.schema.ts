import { z } from 'zod';

const SOP_CATEGORIES = ['food_safety', 'hygiene', 'opening_procedure', 'closing_procedure', 'customer_service', 'emergency'] as const;

export const createDocumentSchema = z.object({
  branchId: z.string().uuid(),
  title: z.string().min(1),
  category: z.enum(SOP_CATEGORIES),
});

export const createVideoSchema = z.object({
  branchId: z.string().uuid(),
  title: z.string().min(1),
  category: z.enum(SOP_CATEGORIES),
  videoUrl: z.string().url(),
  isYoutubeEmbed: z.boolean().default(false),
});

export const createRecipeSchema = z.object({
  branchId: z.string().uuid(),
  name: z.string().min(1),
  basePortions: z.number().int().positive(),
  ingredients: z.array(z.object({
    ingredientName: z.string().min(1),
    amount: z.number().positive(),
    unit: z.string().min(1),
  })).min(1),
});

export const updateRecipeSchema = createRecipeSchema.partial().omit({ branchId: true });

export const scaleQuerySchema = z.object({
  portions: z.coerce.number().int().positive(),
});

export type CreateDocumentInput = z.infer<typeof createDocumentSchema>;
export type CreateVideoInput = z.infer<typeof createVideoSchema>;
export type CreateRecipeInput = z.infer<typeof createRecipeSchema>;
