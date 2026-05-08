import { z } from 'zod';

export const createOrderSchema = z.object({
  branchId: z.string().uuid(),
  tableNumber: z.number().int().positive().optional(),
  isTakeaway: z.boolean().default(false),
  notes: z.string().optional(),
  source: z.enum(['pos', 'online']).default('pos'),
});

export const addOrderItemSchema = z.object({
  menuItemId: z.string().uuid(),
  quantity: z.number().int().positive(),
  notes: z.string().optional(),
});

export const updateOrderSchema = z.object({
  status: z.enum(['pending', 'accepted', 'preparing', 'ready', 'completed', 'cancelled']).optional(),
  items: z.array(addOrderItemSchema).optional(),
  notes: z.string().optional(),
});

export const paymentSchema = z.object({
  paymentMethod: z.enum(['cash', 'pin', 'credit_card', 'online']),
  cashGiven: z.number().int().positive().optional(),
});

export const discountSchema = z.object({
  discountType: z.enum(['percentage', 'fixed']),
  discountAmount: z.number().int().positive(),
  managerPin: z.string().min(1),
  managerId: z.string().uuid(),
});

export const allergenConfirmSchema = z.object({
  orderId: z.string().uuid(),
  menuItemId: z.string().uuid(),
  allergensShown: z.array(z.string()),
});

export const updateTableSchema = z.object({
  status: z.enum(['free', 'occupied', 'reserved']),
  currentOrderId: z.string().uuid().nullable().optional(),
});

export const menuSearchSchema = z.object({
  q: z.string().optional(),
  category: z.string().optional(),
  branchId: z.string().uuid().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(50),
});

export type CreateOrderInput = z.infer<typeof createOrderSchema>;
export type UpdateOrderInput = z.infer<typeof updateOrderSchema>;
export type PaymentInput = z.infer<typeof paymentSchema>;
export type DiscountInput = z.infer<typeof discountSchema>;
export type AllergenConfirmInput = z.infer<typeof allergenConfirmSchema>;
