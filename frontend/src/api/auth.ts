import api from './axios';
import { setToken, clearToken } from './tokenStore';
import type { User } from '@/types';

export async function login(email: string, password: string): Promise<{ user: User; accessToken: string; refreshToken: string }> {
  const { data } = await api.post('/auth/login', { email, password });
  const { accessToken, refreshToken, user } = data;
  setToken(accessToken);
  localStorage.setItem('refreshToken', refreshToken);
  return { user, accessToken, refreshToken };
}

export async function logout(): Promise<void> {
  const refreshToken = localStorage.getItem('refreshToken');
  if (refreshToken) {
    try { await api.post('/auth/logout', { refreshToken }); } catch { /* swallow */ }
  }
  clearToken();
  localStorage.removeItem('refreshToken');
}

export async function getMe(): Promise<User> {
  const { data } = await api.get('/auth/me');
  return data.data;
}
