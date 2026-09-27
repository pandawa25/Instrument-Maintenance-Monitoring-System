import { api } from '@/lib/axios';
import type { InstrumentTypeRef } from '../types/instrument.types';

// Master data read-only — dipakai untuk dropdown di form Instrument.
export async function fetchInstrumentTypes() {
  const { data } = await api.get<{ data: InstrumentTypeRef[] }>('/instrument-types');
  return data.data;
}
