import apiClient from './client';

import type { ApiUser } from '@/types/api';

export interface UpdateProfilePayload {
  firstName?: string;
  lastName?: string;
  username?: string;
  phone?: string;
  bio?: string;
}

export async function updateProfile(payload: UpdateProfilePayload) {
  const { data } = await apiClient.patch<ApiUser>('/profile/me', payload);
  return data;
}
