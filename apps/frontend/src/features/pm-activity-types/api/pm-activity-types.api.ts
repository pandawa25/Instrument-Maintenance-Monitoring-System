import { api } from '@/lib/axios';
import type { PaginatedResult } from '@/lib/types';
import type {
  PmActivityType,
  PmActivityTypeFormValues,
  PmActivityTypeQueryParams,
} from '../types/pm-activity-type.types';

export async function fetchPmActivityTypes(params: PmActivityTypeQueryParams) {
  const { data } = await api.get<PaginatedResult<PmActivityType>>('/pm-activity-types', { params });
  return data;
}

export async function fetchPmActivityTypeById(id: string) {
  const { data } = await api.get<{ data: PmActivityType }>(`/pm-activity-types/${id}`);
  return data.data;
}

export async function fetchPmActivityTypesForDropdown() {
  const { data } = await api.get<{ data: PmActivityType[] }>('/pm-activity-types/dropdown');
  return data.data;
}

export async function createPmActivityType(payload: PmActivityTypeFormValues) {
  const { data } = await api.post<{ data: PmActivityType }>('/pm-activity-types', payload);
  return data.data;
}

export async function updatePmActivityType(id: string, payload: Partial<PmActivityTypeFormValues>) {
  const { data } = await api.patch<{ data: PmActivityType }>(`/pm-activity-types/${id}`, payload);
  return data.data;
}

export async function deletePmActivityType(id: string) {
  await api.delete(`/pm-activity-types/${id}`);
}
