import api from './axios';
import type { ReviewBranch } from '@/types';

export async function getReviews(branchId?: string): Promise<ReviewBranch[]> {
  const { data } = await api.get('/reviews', { params: { branchId } });
  return data.data;
}

export async function createReview(body: { branchId: string; score: number; reviewCount?: number; source?: string }): Promise<ReviewBranch> {
  const { data } = await api.post('/reviews', body);
  return data.data;
}
