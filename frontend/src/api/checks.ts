import apiClient from './client';

import type {
  ApiCheck,
  ChecksSummaryResponse
} from '@/types/api';

export type CheckPeriod = 'day' | 'week' | 'month' | 'custom';

export interface ListChecksParams {
  userId?: string;
  period?: Exclude<CheckPeriod, 'custom'>;
  startDate?: string;
  endDate?: string;
}

export interface CreateCheckPayload {
  userId: string;
  amount: number;
  note?: string;
}

export interface UpdateCheckPayload {
  amount?: number;
  note?: string;
}

export async function listChecks(params: ListChecksParams) {
  const { data } = await apiClient.get<ApiCheck[]>('/checks', {
    params
  });
  return data;
}

export async function createCheck(payload: CreateCheckPayload) {
  const { data } = await apiClient.post<ApiCheck>('/checks', payload);
  return data;
}

export async function updateCheck(id: string, payload: UpdateCheckPayload) {
  const { data } = await apiClient.put<ApiCheck>(`/checks/${id}`, payload);
  return data;
}

export async function deleteCheck(id: string) {
  await apiClient.delete<void>(`/checks/${id}`);
}

export async function fetchChecksSummary(params: { startDate?: string; endDate?: string }) {
  const { data } = await apiClient.get<ChecksSummaryResponse>('/checks/summary', {
    params
  });
  return data;
}
