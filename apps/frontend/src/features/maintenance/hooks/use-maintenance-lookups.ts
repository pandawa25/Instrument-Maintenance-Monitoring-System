import { useQuery } from '@tanstack/react-query';
import { fetchAreasForDropdown } from '../api/areas-lookup.api';
import { fetchEquipmentForDropdown } from '../api/equipment-lookup.api';
import { fetchTechniciansForDropdown } from '../api/technicians-lookup.api';

// Data master yang jarang berubah — staleTime panjang supaya tidak query ulang tiap buka form/filter.
export function useAreasLookup() {
  return useQuery({
    queryKey: ['areas-lookup'],
    queryFn: fetchAreasForDropdown,
    staleTime: 5 * 60 * 1000,
  });
}

export function useEquipmentLookup() {
  return useQuery({
    queryKey: ['equipment-lookup'],
    queryFn: fetchEquipmentForDropdown,
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
