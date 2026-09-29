import { api } from '@/lib/axios';
import type { PaginatedResult } from '@/lib/types';
import type { SparePart, SparePartFormValues, SparePartQueryParams } from '../types/spare-part.types';

export async function fetchSpareParts(params: SparePartQueryParams) {
  const { data } = await api.get<PaginatedResult<SparePart>>('/spare-parts', {
    params: { ...params, status: params.status || undefined },
  });
  return data;
}

export async function fetchSparePartById(id: string) {
  const { data } = await api.get<{ data: SparePart }>(`/spare-parts/${id}`);
  return data.data;
}

// Dropdown tanpa pagination — dibutuhkan penuh oleh multi-select material di
// form Corrective Maintenance, berapa pun jumlah spare part-nya.
export async function fetchSparePartsForDropdown() {
  const { data } = await api.get<{ data: SparePart[] }>('/spare-parts/dropdown');
  return data.data;
}

export async function createSparePart(payload: SparePartFormValues) {
  const { data } = await api.post<{ data: SparePart }>('/spare-parts', payload);
  return data.data;
}

export async function updateSparePart(id: string, payload: Partial<SparePartFormValues>) {
  const { data } = await api.patch<{ data: SparePart }>(`/spare-parts/${id}`, payload);
  return data.data;
}

export async function deleteSparePart(id: string) {
  await api.delete(`/spare-parts/${id}`);
}
