import { api } from '@/lib/axios';
import type { PaginatedResult } from '@/lib/types';
import type { Area, AreaFormValues, AreaQueryParams } from '../types/area.types';

export async function fetchAreas(params: AreaQueryParams) {
  const { data } = await api.get<PaginatedResult<Area>>('/areas', {
    params: { ...params, status: params.status || undefined },
  });
  return data;
}

export async function fetchAreaById(id: string) {
  const { data } = await api.get<{ data: Area }>(`/areas/${id}`);
  return data.data;
}

export async function createArea(payload: AreaFormValues) {
  const { data } = await api.post<{ data: Area }>('/areas', payload);
  return data.data;
}

export async function updateArea(id: string, payload: Partial<AreaFormValues>) {
  const { data } = await api.patch<{ data: Area }>(`/areas/${id}`, payload);
  return data.data;
}

export async function deleteArea(id: string) {
  await api.delete(`/areas/${id}`);
}
