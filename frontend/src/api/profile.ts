import apiClient from './client';

import type { ApiUser } from '@/types/api';

export interface UpdateProfilePayload {
  payoutUsdtTrc20?: string;
  payoutUsdtBep20?: string;
}

export async function updateProfile(payload: UpdateProfilePayload) {
  const { data } = await apiClient.patch<ApiUser>('/profile/me', payload);
  return data;
}
