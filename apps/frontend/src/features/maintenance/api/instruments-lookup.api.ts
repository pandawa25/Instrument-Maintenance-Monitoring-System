import { api } from '@/lib/axios';
import type { PaginatedResult } from '@/lib/types';
import type { InstrumentRef } from '../types/maintenance.types';

// Lookup ringan untuk dropdown Instrument di form Corrective Maintenance.
export async function fetchInstrumentsForDropdown() {
  const { data } = await api.get<PaginatedResult<InstrumentRef & { tagNumber: string }>>('/instruments', {
    params: { limit: 100, sortBy: 'tagNumber', sortOrder: 'asc' },
  });
  return data.data;
}
