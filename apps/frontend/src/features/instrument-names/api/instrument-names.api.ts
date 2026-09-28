import { api } from '@/lib/axios';
import type { PaginatedResult } from '@/lib/types';
import type {
  InstrumentName,
  InstrumentNameFormValues,
  InstrumentNameQueryParams,
} from '../types/instrument-name.types';

export async function fetchInstrumentNames(params: InstrumentNameQueryParams) {
  const { data } = await api.get<PaginatedResult<InstrumentName>>('/instrument-names', { params });
  return data;
}

export async function fetchInstrumentNameById(id: string) {
  const { data } = await api.get<{ data: InstrumentName }>(`/instrument-names/${id}`);
  return data.data;
}

export async function createInstrumentName(payload: InstrumentNameFormValues) {
  const { data } = await api.post<{ data: InstrumentName }>('/instrument-names', payload);
  return data.data;
}

export async function updateInstrumentName(id: string, payload: Partial<InstrumentNameFormValues>) {
  const { data } = await api.patch<{ data: InstrumentName }>(`/instrument-names/${id}`, payload);
  return data.data;
}

export async function deleteInstrumentName(id: string) {
  await api.delete(`/instrument-names/${id}`);
}
