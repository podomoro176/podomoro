import api from './axios';
import type { Shift, Employee, LeaveRequest } from '@/types';

export async function getSchedule(week: string, branchId?: string): Promise<Shift[]> {
  const { data } = await api.get('/hr/schedule', { params: { week, branchId } });
  return data.data;
}

export async function createShift(body: { branchId: string; employeeId: string; date: string; startTime: string; endTime: string; roleOnShift: string }): Promise<Shift> {
  const { data } = await api.post('/hr/shifts', body);
  return data.data;
}

export async function getMyShifts(): Promise<Shift[]> {
  const { data } = await api.get('/hr/shifts/my');
  return data.data;
}

export async function clockIn(): Promise<unknown> {
  const { data } = await api.post('/hr/attendance/clock-in');
  return data.data;
}

export async function clockOut(): Promise<unknown> {
  const { data } = await api.post('/hr/attendance/clock-out');
  return data.data;
}

export async function getAttendanceVariance(week: string): Promise<unknown> {
  const { data } = await api.get('/hr/attendance/variance', { params: { week } });
  return data.data;
}

export async function submitLeave(body: { type: string; startDate: string; endDate: string; reason?: string }): Promise<LeaveRequest> {
  const { data } = await api.post('/hr/leave', body);
  return data.data;
}

export async function listLeave(params?: { status?: string }): Promise<LeaveRequest[]> {
  const { data } = await api.get('/hr/leave', { params });
  return data.data;
}

export async function reviewLeave(id: string, body: { status: 'approved' | 'rejected' }): Promise<LeaveRequest> {
  const { data } = await api.put(`/hr/leave/${id}`, body);
  return data.data;
}

export async function getEmployees(): Promise<Employee[]> {
  const { data } = await api.get('/hr/employees');
  return data.data;
}

export async function submitAvailability(body: { date: string; isUnavailable: boolean; reason?: string }): Promise<unknown> {
  const { data } = await api.post('/hr/availability', body);
  return data.data;
}
