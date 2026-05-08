import { z } from 'zod';

export const createSupplierSchema = z.object({
  branchId: z.string().uuid(),
  name: z.string().min(1),
  contactPerson: z.string().optional(),
  email: z.string().email(),
  phone: z.string().optional(),
  orderDays: z.array(z.enum(['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'])).min(1),
  leadTimeDays: z.number().int().min(0).default(1),
});

export const createProductSchema = z.object({
  supplierId: z.string().uuid(),
  name: z.string().min(1),
  unit: z.enum(['kg', 'liter', 'stuk']),
  pricePerUnit: z.number().int().positive(),
  minOrderQuantity: z.number().positive(),
});

export const createOrderSchema = z.object({
  branchId: z.string().uuid(),
  supplierId: z.string().uuid(),
  items: z.array(z.object({
    supplierProductId: z.string().uuid(),
    orderedQuantity: z.number().positive(),
  })).min(1),
});

export const receiveOrderSchema = z.object({
  items: z.array(z.object({
    id: z.string().uuid(),
    receivedQuantity: z.number().positive(),
  })).min(1),
});

export const updateStockSchema = z.object({
  currentStock: z.number().min(0),
  parLevel: z.number().min(0).optional(),
});

export type CreateSupplierInput = z.infer<typeof createSupplierSchema>;
export type CreateProductInput = z.infer<typeof createProductSchema>;
export type CreateOrderInput = z.infer<typeof createOrderSchema>;
export type ReceiveOrderInput = z.infer<typeof receiveOrderSchema>;
