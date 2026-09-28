import { useQuery } from '@tanstack/react-query';
import { fetchAreasForDropdown } from '../api/areas-lookup.api';
import { fetchInstrumentsForDropdown } from '../api/instruments-lookup.api';
import { fetchTechniciansForDropdown } from '../api/technicians-lookup.api';

// Data master yang jarang berubah — staleTime panjang supaya tidak query ulang tiap buka form/filter.
export function useAreasLookup() {
  return useQuery({
    queryKey: ['areas-lookup'],
    queryFn: fetchAreasForDropdown,
    staleTime: 5 * 60 * 1000,
  });
}

export function useInstrumentsLookup() {
  return useQuery({
    queryKey: ['instruments-lookup'],
    queryFn: fetchInstrumentsForDropdown,
    staleTime: 5 * 60 * 1000,
  });
}

export function useTechniciansLookup() {
  return useQuery({
    queryKey: ['technicians-lookup'],
    queryFn: fetchTechniciansForDropdown,
    staleTime: 5 * 60 * 1000,
  });
}
