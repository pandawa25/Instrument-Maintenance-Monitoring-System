import { api } from '@/lib/axios';
import type { CreatePmPeriodPayload, PmPeriodDetail, PmPeriodListItem } from '../types/pm-period.types';

export async function fetchPmPeriods(programId: string) {
  const { data } = await api.get<{ data: PmPeriodListItem[] }>(`/pm-programs/${programId}/periods`);
  return data.data;
}

export async function fetchPmPeriodById(id: string) {
  const { data } = await api.get<{ data: PmPeriodDetail }>(`/pm-periods/${id}`);
  return data.data;
}

export async function fetchNextPmPeriodNumber(programId: string) {
  const { data } = await api.get<{ data: { nextPeriodNumber: number } }>(`/pm-programs/${programId}/periods/next-number`);
  return data.data.nextPeriodNumber;
}

export async function createPmPeriod(programId: string, payload: CreatePmPeriodPayload) {
  const { data } = await api.post<{ data: PmPeriodDetail }>(`/pm-programs/${programId}/periods`, payload);
  return data.data;
}

export async function updatePmPeriod(id: string, payload: Partial<CreatePmPeriodPayload>) {
  const { data } = await api.patch<{ data: PmPeriodDetail }>(`/pm-periods/${id}`, payload);
  return data.data;
}

export async function deletePmPeriod(id: string) {
  await api.delete(`/pm-periods/${id}`);
}
