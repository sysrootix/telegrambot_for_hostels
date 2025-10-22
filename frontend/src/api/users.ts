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
  payoutUsdtTrc20?: string;
  payoutUsdtBep20?: string;
  chatId?: string;
  commissionPercent?: number | null;
  isPartner?: boolean;
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

export async function muteUser(id: string, payload: { durationMinutes?: number; until?: string; chatId?: string }) {
  const { data } = await apiClient.post<ApiUser>(`/users/${id}/mute`, payload);
  return data;
}

export async function unmuteUser(id: string, payload: { chatId?: string }) {
  const { data } = await apiClient.post<ApiUser>(`/users/${id}/unmute`, payload);
  return data;
}

export async function blockUser(id: string, payload: { chatId?: string; reason?: string }) {
  const { data } = await apiClient.post<ApiUser>(`/users/${id}/block`, payload);
  return data;
}

export async function unblockUser(id: string, payload: { chatId?: string }) {
  const { data } = await apiClient.post<ApiUser>(`/users/${id}/unblock`, payload);
  return data;
}
