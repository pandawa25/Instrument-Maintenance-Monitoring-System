import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  createSparePart,
  createStandaloneMovement,
  createStockMovement,
  deleteSparePart,
  fetchInventoryCharts,
  fetchInventorySummary,
  fetchSpareParts,
  fetchSparePartsForDropdown,
  fetchStockIn,
  fetchStockMovements,
  fetchStockOut,
  updateSparePart,
} from '../api/spare-parts.api';
import type {
  AllStockMovementsQueryParams,
  CreateStandaloneMovementPayload,
  CreateStockMovementPayload,
  SparePartFormValues,
  SparePartQueryParams,
  StockMovementQueryParams,
} from '../types/spare-part.types';

const SPARE_PARTS_KEY = 'spare-parts';

export function useSpareParts(params: SparePartQueryParams) {
  return useQuery({
    queryKey: [SPARE_PARTS_KEY, 'list', params],
    queryFn: () => fetchSpareParts(params),
    placeholderData: (prev) => prev,
  });
}

export function useSparePartsLookup() {
  return useQuery({
    queryKey: [SPARE_PARTS_KEY, 'dropdown'],
    queryFn: fetchSparePartsForDropdown,
    staleTime: 5 * 60 * 1000,
  });
}

export function useCreateSparePart() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: SparePartFormValues) => createSparePart(payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [SPARE_PARTS_KEY] }),
  });
}

export function useUpdateSparePart() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Partial<SparePartFormValues> }) =>
      updateSparePart(id, payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [SPARE_PARTS_KEY] }),
  });
}

export function useDeleteSparePart() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteSparePart(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [SPARE_PARTS_KEY] }),
  });
}

export function useStockMovements(sparePartId: string | undefined, params: StockMovementQueryParams) {
  return useQuery({
    queryKey: [SPARE_PARTS_KEY, 'stock-movements', sparePartId, params],
    queryFn: () => fetchStockMovements(sparePartId as string, params),
    enabled: Boolean(sparePartId),
    placeholderData: (prev) => prev,
  });
}

export function useCreateStockMovement() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ sparePartId, payload }: { sparePartId: string; payload: CreateStockMovementPayload }) =>
      createStockMovement(sparePartId, payload),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: [SPARE_PARTS_KEY] });
      queryClient.invalidateQueries({ queryKey: [SPARE_PARTS_KEY, 'stock-movements', variables.sparePartId] });
    },
  });
}

// --- Stock In / Stock Out (ledger lintas spare part) ---

export function useStockIn(params: AllStockMovementsQueryParams) {
  return useQuery({
    queryKey: [SPARE_PARTS_KEY, 'stock-in', params],
    queryFn: () => fetchStockIn(params),
    placeholderData: (prev) => prev,
  });
}

export function useStockOut(params: AllStockMovementsQueryParams) {
  return useQuery({
    queryKey: [SPARE_PARTS_KEY, 'stock-out', params],
    queryFn: () => fetchStockOut(params),
    placeholderData: (prev) => prev,
  });
}

/** Dipakai dialog create Stock In (type='RESTOCK') & Stock Out (type='STOCK_OUT'). */
export function useCreateStandaloneMovement(type: 'RESTOCK' | 'STOCK_OUT') {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateStandaloneMovementPayload) => createStandaloneMovement(type, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [SPARE_PARTS_KEY] });
    },
  });
}

// --- Inventory Dashboard ---

export function useInventorySummary() {
  return useQuery({
    queryKey: [SPARE_PARTS_KEY, 'dashboard', 'summary'],
    queryFn: fetchInventorySummary,
  });
}

export function useInventoryCharts(months = 6) {
  return useQuery({
    queryKey: [SPARE_PARTS_KEY, 'dashboard', 'charts', months],
    queryFn: () => fetchInventoryCharts(months),
  });
}
