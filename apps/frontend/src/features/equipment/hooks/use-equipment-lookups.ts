import { useQuery } from '@tanstack/react-query';
import { fetchInstrumentNames } from '../api/instrument-names.api';
import { fetchAreasForDropdown } from '../api/areas-lookup.api';

// Data master yang jarang berubah — staleTime panjang supaya tidak query ulang tiap buka form.
export function useInstrumentNames() {
  return useQuery({
    queryKey: ['instrument-names'],
    queryFn: fetchInstrumentNames,
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
