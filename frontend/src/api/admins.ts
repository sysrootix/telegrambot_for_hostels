import apiClient from './client';

import type { ApiAdmin } from '@/types/api';

export interface UpsertAdminPayload {
  telegramId: string;
  displayName?: string;
  notes?: string;
}

export async function listAdmins() {
  const { data } = await apiClient.get<ApiAdmin[]>('/admins');
  return data;
}

export async function createAdmin(payload: UpsertAdminPayload) {
  const { data } = await apiClient.post<ApiAdmin>('/admins', payload);
  return data;
}

export async function updateAdmin(id: string, payload: Partial<UpsertAdminPayload>) {
  const { data } = await apiClient.put<ApiAdmin>(`/admins/${id}`, payload);
  return data;
}

export async function deleteAdmin(id: string) {
  await apiClient.delete<void>(`/admins/${id}`);
}
