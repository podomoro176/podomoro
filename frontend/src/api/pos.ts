import api from './axios';
import type { Order, Transaction, PaginatedResult } from '@/types';

export async function createOrder(body: { branchId: string; isTakeaway?: boolean; tableNumber?: number; notes?: string }): Promise<Order> {
  const { data } = await api.post('/pos/orders', body);
  return data.data;
}

export async function updateOrder(id: string, body: { items?: Array<{ menuItemId: string; quantity: number; notes?: string }>; status?: string; notes?: string }): Promise<Order> {
  const { data } = await api.put(`/pos/orders/${id}`, body);
  return data.data;
}

export async function processPayment(orderId: string, body: { paymentMethod: string; cashGiven?: number }): Promise<{ transaction: Transaction; order: Order; change?: number }> {
  const { data } = await api.post(`/pos/orders/${orderId}/payment`, body);
  return data.data;
}

export async function applyDiscount(orderId: string, body: { discountType: string; discountAmount: number }): Promise<Order> {
  const { data } = await api.post(`/pos/orders/${orderId}/discount`, body);
  return data.data;
}

export async function getOrders(params?: { branchId?: string; page?: number; limit?: number }): Promise<PaginatedResult<Order>> {
  const { data } = await api.get('/pos/orders', { params });
  return data.data;
}

export async function getTables(): Promise<unknown[]> {
  const { data } = await api.get('/pos/tables');
  return data.data;
}

export async function updateTable(id: string, body: { status: string; currentOrderId?: string | null }): Promise<unknown> {
  const { data } = await api.put(`/pos/tables/${id}`, body);
  return data.data;
}
