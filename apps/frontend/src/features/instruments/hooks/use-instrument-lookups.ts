import { useQuery } from '@tanstack/react-query';
import { fetchInstrumentTypes } from '../api/instrument-types.api';
import { fetchAreasForDropdown } from '../api/areas-lookup.api';

// Data master yang jarang berubah — staleTime panjang supaya tidak query ulang tiap buka form.
export function useInstrumentTypes() {
  return useQuery({
    queryKey: ['instrument-types'],
    queryFn: fetchInstrumentTypes,
    staleTime: 5 * 60 * 1000,
  });
}

export function useAreasLookup() {
  return useQuery({
    queryKey: ['areas-lookup'],
    queryFn: fetchAreasForDropdown,
    staleTime: 5 * 60 * 1000,
  });
}
