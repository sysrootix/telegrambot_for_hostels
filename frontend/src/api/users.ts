import apiClient from './client';

import type { ApiUser } from '@/types/api';

export interface UpsertUserPayload {
  telegramId: string;
  username?: string;
  firstName?: string;
  lastName?: string;
  languageCode?: string;
  photoUrl?: string;
  phone?: string;
  bio?: string;
  payoutDetails?: string;
}

export async function listUsers() {
  const { data } = await apiClient.get<ApiUser[]>('/users');
  return data;
}

export async function createUser(payload: UpsertUserPayload) {
  const { data } = await apiClient.post<ApiUser>('/users', payload);
  return data;
}

export async function updateUser(id: string, payload: Partial<UpsertUserPayload>) {
  const { data } = await apiClient.put<ApiUser>(`/users/${id}`, payload);
  return data;
}

export async function deleteUser(id: string) {
  await apiClient.delete<void>(`/users/${id}`);
}
