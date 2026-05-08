import { z } from 'zod';

const ALLERGENS = [
  'gluten', 'schaaldieren', 'eieren', 'vis', 'pinda', 'soja', 'melk',
  'noten', 'selderij', 'mosterd', 'sesam', 'sulfieten', 'lupine', 'weekdieren',
] as const;

export const createMenuItemSchema = z.object({
  branchId: z.string().uuid(),
  name: z.string().min(1).max(150),
  description: z.string().optional(),
  price: z.number().int().positive(),
  category: z.string().min(1),
  imageUrl: z.string().url().optional(),
  allergens: z.array(z.enum(ALLERGENS)).default([]),
  isAvailable: z.boolean().default(true),
});

export const updateMenuItemSchema = createMenuItemSchema.partial().omit({ branchId: true });

export const menuQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  category: z.string().optional(),
  branchId: z.string().uuid().optional(),
});

export type CreateMenuItemInput = z.infer<typeof createMenuItemSchema>;
export type UpdateMenuItemInput = z.infer<typeof updateMenuItemSchema>;
export type MenuQuery = z.infer<typeof menuQuerySchema>;
