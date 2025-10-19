import apiClient from './client';

import type { SessionResponse } from '@/types/api';

export async function fetchSession() {
  const { data } = await apiClient.get<SessionResponse>('/auth/session');
  return data;
}
