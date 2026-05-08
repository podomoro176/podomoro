import api from './axios';
import type { MenuItem, PaginatedResult } from '@/types';

export async function getOnlineMenu(params?: { branchId?: string; page?: number; limit?: number }): Promise<PaginatedResult<MenuItem>> {
  const { data } = await api.get('/online/menu', { params });
  return data.data;
}

export async function getPosMenu(params?: { branchId?: string; q?: string; category?: string }): Promise<PaginatedResult<MenuItem>> {
  const { data } = await api.get('/pos/menu', { params });
  return data.data;
}

export async function getAllergens(menuItemId: string): Promise<{ id: string; name: string; allergens: string[] }> {
  const { data } = await api.get(`/pos/allergens/${menuItemId}`);
  return data.data;
}

export async function confirmAllergens(body: { orderId: string; menuItemId: string; allergensShown: string[] }): Promise<void> {
  await api.post('/pos/allergens/confirm', body);
}
