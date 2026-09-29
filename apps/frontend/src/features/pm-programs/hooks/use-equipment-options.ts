import { useQuery } from '@tanstack/react-query';
import { fetchEquipmentOptions } from '../api/equipment-options.api';

export function useEquipmentOptions() {
  return useQuery({
    queryKey: ['equipment', 'options-all'],
    queryFn: fetchEquipmentOptions,
    staleTime: 60 * 1000,
  });
}
