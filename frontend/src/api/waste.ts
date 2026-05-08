import api from './axios';
import type { WasteEntry, PaginatedResult } from '@/types';

export async function logWaste(body: { branchId: string; date: string; itemName: string; quantity: number; unit: string; reason: string }): Promise<WasteEntry> {
  const { data } = await api.post('/waste', body);
  return data.data;
}

export async function updateWasteCost(id: string, costPrice: number): Promise<WasteEntry> {
  const { data } = await api.put(`/waste/${id}/cost`, { costPrice });
  return data.data;
}

export async function listWaste(params?: { branchId?: string; date?: string; page?: number; limit?: number }): Promise<PaginatedResult<WasteEntry>> {
  const { data } = await api.get('/waste', { params });
  return data.data;
}

export async function getWasteTotals(period: 'day' | 'week' | 'month', branchId?: string): Promise<{ period: string; totalCost: number; totalEntries: number }> {
  const { data } = await api.get('/waste/totals', { params: { period, branchId } });
  return data.data;
}
