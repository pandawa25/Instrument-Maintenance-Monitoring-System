import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  commitBulkImport,
  createEquipment,
  deleteEquipment,
  fetchEquipment,
  fetchEquipmentById,
  fetchEquipmentStatusCounts,
  fetchImportBatchRows,
  fetchManufacturers,
  previewBulkEquipment,
  updateEquipment,
} from '../api/equipment.api';
import type { EquipmentFormValues, EquipmentQueryParams, ImportRowSeverity } from '../types/equipment.types';

const EQUIPMENT_KEY = 'equipment';

export function useEquipmentList(params: EquipmentQueryParams) {
  return useQuery({
    queryKey: [EQUIPMENT_KEY, params],
    queryFn: () => fetchEquipment(params),
    placeholderData: (prev) => prev,
  });
}

// Count per status untuk summary card (Total/Active/Standby/Out Of Service) — ikut filter
// yang sedang aktif di halaman list (search/area/instrument name/manufacturer), KECUALI
// filter status itu sendiri (lihat EquipmentRepository.getStatusCounts()).
export function useEquipmentStatusCounts(params: EquipmentQueryParams) {
  return useQuery({
    queryKey: [EQUIPMENT_KEY, 'status-counts', params],
    queryFn: () => fetchEquipmentStatusCounts(params),
    placeholderData: (prev) => prev,
  });
}

// Dipakai EquipmentDetailPage (halaman View/Edit) — bukan oleh list page.
export function useEquipmentById(id: string | undefined) {
  return useQuery({
    queryKey: [EQUIPMENT_KEY, id],
    queryFn: () => fetchEquipmentById(id as string),
    enabled: Boolean(id),
  });
}

export function useManufacturers() {
  return useQuery({
    queryKey: [EQUIPMENT_KEY, 'manufacturers'],
    queryFn: fetchManufacturers,
    staleTime: 5 * 60_000, // jarang berubah — cukup refetch tiap 5 menit
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

// Tahap 1 — belum mengubah data equipment, jadi TIDAK invalidate query list di sini.
export function usePreviewBulkImport() {
  return useMutation({
    mutationFn: (file: File) => previewBulkEquipment(file),
  });
}

export function useImportBatchRows(
  batchId: string | null,
  params: { severity?: ImportRowSeverity; page: number; limit: number },
) {
  return useQuery({
    queryKey: ['import-batch-rows', batchId, params],
    queryFn: () => fetchImportBatchRows(batchId as string, params),
    enabled: Boolean(batchId),
    placeholderData: (prev) => prev,
  });
}

// Tahap 2 — baru di sini data equipment benar-benar berubah, jadi invalidate list.
export function useCommitBulkImport() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (batchId: string) => commitBulkImport(batchId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [EQUIPMENT_KEY] }),
  });
}
