import api from './axios';
import type { Transaction, PaginatedResult } from '@/types';

export async function getFinanceDashboard(branchId?: string): Promise<unknown> {
  const { data } = await api.get('/finance/dashboard', { params: { branchId } });
  return data.data;
}

export async function getTransactions(params: { branchId?: string; dateFrom?: string; dateTo?: string; paymentMethod?: string; cashierId?: string; page?: number; limit?: number }): Promise<PaginatedResult<Transaction>> {
  const { data } = await api.get('/finance/transactions', { params });
  return data.data;
}

export async function exportTransactions(format: 'csv' | 'pdf', params?: { branchId?: string; dateFrom?: string; dateTo?: string }): Promise<Blob> {
  const { data } = await api.get('/finance/transactions/export', { params: { format, ...params }, responseType: 'blob' });
  return data;
}

export async function getPayroll(params: { period_start: string; period_end: string; branchId?: string }): Promise<unknown> {
  const { data } = await api.get('/finance/payroll', { params });
  return data.data;
}

export async function exportPayroll(params: { period_start: string; period_end: string; branchId?: string }): Promise<Blob> {
  const { data } = await api.get('/finance/payroll/export', { params, responseType: 'blob' });
  return data;
}

export async function getWasteFinance(period: 'day' | 'week' | 'month', branchId?: string): Promise<unknown> {
  const { data } = await api.get('/finance/waste', { params: { period, branchId } });
  return data.data;
}

export async function getCogs(params: { period_start: string; period_end: string; branchId?: string }): Promise<unknown> {
  const { data } = await api.get('/finance/cogs', { params });
  return data.data;
}

export async function closePeriod(body: { branchId: string; periodStart: string; periodEnd: string }): Promise<unknown> {
  const { data } = await api.post('/finance/periods', body);
  return data.data;
}
