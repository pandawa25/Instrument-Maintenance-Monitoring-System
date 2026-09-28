import { api } from '@/lib/axios';
import type { InstrumentNameRef } from '../types/equipment.types';

// Dipakai untuk dropdown "Instrument Name" di form Equipment — tanpa pagination.
export async function fetchInstrumentNames() {
  const { data } = await api.get<{ data: InstrumentNameRef[] }>('/instrument-names/dropdown');
  return data.data;
}
