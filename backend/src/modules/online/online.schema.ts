import { z } from 'zod';

export const cartItemSchema = z.object({
  menuItemId: z.string().uuid(),
  quantity: z.number().int().positive(),
  notes: z.string().optional(),
});

export const checkoutSchema = z.object({
  branchId: z.string().uuid(),
  items: z.array(cartItemSchema).min(1),
  customerEmail: z.string().email(),
  customerName: z.string().min(1),
  isTakeaway: z.boolean().default(false),
  notes: z.string().optional(),
});

export const reservationSchema = z.object({
  branchId: z.string().uuid(),
  name: z.string().min(1),
  email: z.string().email(),
  phone: z.string().min(1),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  time: z.string().regex(/^\d{2}:\d{2}$/),
  partySize: z.number().int().positive().max(50),
  notes: z.string().optional(),
});

export type CheckoutInput = z.infer<typeof checkoutSchema>;
export type ReservationInput = z.infer<typeof reservationSchema>;
