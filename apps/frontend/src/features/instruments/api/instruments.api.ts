import { api } from '@/lib/axios';
import type { PaginatedResult } from '@/lib/types';
import type { Instrument, InstrumentFormValues, InstrumentQueryParams } from '../types/instrument.types';

export async function fetchInstruments(params: InstrumentQueryParams) {
  const { data } = await api.get<PaginatedResult<Instrument>>('/instruments', {
    params: {
      ...params,
      areaId: params.areaId || undefined,
      instrumentTypeId: params.instrumentTypeId || undefined,
      status: params.status || undefined,
    },
  });
  return data;
}

export async function fetchInstrumentById(id: string) {
  const { data } = await api.get<{ data: Instrument }>(`/instruments/${id}`);
  return data.data;
}

export async function createInstrument(payload: InstrumentFormValues) {
  const { data } = await api.post<{ data: Instrument }>('/instruments', payload);
  return data.data;
}

export async function updateInstrument(id: string, payload: Partial<InstrumentFormValues>) {
  const { data } = await api.patch<{ data: Instrument }>(`/instruments/${id}`, payload);
  return data.data;
}

export async function deleteInstrument(id: string) {
  await api.delete(`/instruments/${id}`);
}
