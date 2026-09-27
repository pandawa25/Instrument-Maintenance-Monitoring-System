import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createArea, deleteArea, fetchAreas, updateArea } from '../api/areas.api';
import type { AreaFormValues, AreaQueryParams } from '../types/area.types';

const AREAS_KEY = 'areas';

export function useAreas(params: AreaQueryParams) {
  return useQuery({
    queryKey: [AREAS_KEY, params],
    queryFn: () => fetchAreas(params),
    placeholderData: (prev) => prev,
  });
}

export function useCreateArea() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: AreaFormValues) => createArea(payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [AREAS_KEY] }),
  });
}

export function useUpdateArea() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Partial<AreaFormValues> }) => updateArea(id, payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [AREAS_KEY] }),
  });
}

export function useDeleteArea() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteArea(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [AREAS_KEY] }),
  });
}
