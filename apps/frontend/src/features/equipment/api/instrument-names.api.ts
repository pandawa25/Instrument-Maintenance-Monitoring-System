import { api } from '@/lib/axios';
import type { InstrumentNameRef } from '../types/equipment.types';

// Master data read-only — dipakai untuk dropdown "Instrument Name" di form Equipment.
export async function fetchInstrumentNames() {
  const { data } = await api.get<{ data: InstrumentNameRef[] }>('/instrument-names');
  return data.data;
}
