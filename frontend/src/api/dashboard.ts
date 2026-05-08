import api from './axios';
import type { KpiData, RevenueDataPoint, AlertsData, Order } from '@/types';

export async function getKpis(): Promise<KpiData> {
  const { data } = await api.get('/dashboard/kpis');
  return data.data;
}

export async function getRevenueChart(days = 7): Promise<RevenueDataPoint[]> {
  const { data } = await api.get('/dashboard/revenue', { params: { days } });
  return data.data;
}

export async function getAlerts(): Promise<AlertsData> {
  const { data } = await api.get('/dashboard/alerts');
  return data.data;
}

export async function getRecentOrders(): Promise<Order[]> {
  const { data } = await api.get('/dashboard/orders/recent');
  return data.data;
}
