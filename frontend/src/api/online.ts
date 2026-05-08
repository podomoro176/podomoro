import api from './axios';
import type { MenuItem, PaginatedResult } from '@/types';

export async function getOnlineMenu(params?: { branchId?: string; page?: number; limit?: number }): Promise<PaginatedResult<MenuItem>> {
  const { data } = await api.get('/online/menu', { params });
  return data.data;
}

export async function validateCart(items: Array<{ menuItemId: string; quantity: number }>): Promise<void> {
  await api.post('/online/cart', { items });
}

export async function checkout(body: { branchId: string; customerEmail: string; customerName: string; isTakeaway: boolean; items: Array<{ menuItemId: string; quantity: number }>; notes?: string }): Promise<{ clientSecret: string; amount: number; orderId: string }> {
  const { data } = await api.post('/online/checkout', body);
  return data.data;
}

export async function getOrderStatus(orderId: string): Promise<{ id: string; status: string; orderNumber: number; updatedAt: string }> {
  const { data } = await api.get(`/online/order/${orderId}/status`);
  return data.data;
}
