import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createEquipment, deleteEquipment, fetchEquipment, updateEquipment } from '../api/equipment.api';
import type { EquipmentFormValues, EquipmentQueryParams } from '../types/equipment.types';

const EQUIPMENT_KEY = 'equipment';

export function useEquipmentList(params: EquipmentQueryParams) {
  return useQuery({
    queryKey: [EQUIPMENT_KEY, params],
    queryFn: () => fetchEquipment(params),
    placeholderData: (prev) => prev,
  });
}

export function useCreateEquipment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: EquipmentFormValues) => createEquipment(payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [EQUIPMENT_KEY] }),
  });
}

export function useUpdateEquipment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Partial<EquipmentFormValues> }) =>
      updateEquipment(id, payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [EQUIPMENT_KEY] }),
  });
}

export function useDeleteEquipment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteEquipment(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [EQUIPMENT_KEY] }),
  });
}
