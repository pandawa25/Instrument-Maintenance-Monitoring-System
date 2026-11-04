import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  commitWorkOrderImport,
  fetchWorkOrderById,
  fetchWorkOrderDropdownByEquipment,
  fetchWorkOrderImportRows,
  fetchWorkOrderOrderTypes,
  fetchWorkOrders,
  fetchWorkOrderStageCounts,
  previewWorkOrderImport,
  relinkWorkOrderEquipment,
} from '../api/work-orders.api';
import type { ImportRowSeverity, WorkOrderQueryParams } from '../types/work-order.types';

const WORK_ORDER_KEY = 'work-orders';

export function useWorkOrderList(params: WorkOrderQueryParams) {
  return useQuery({
    queryKey: [WORK_ORDER_KEY, params],
    queryFn: () => fetchWorkOrders(params),
    placeholderData: (prev) => prev,
  });
}

// Ikut filter yang sedang aktif (KECUALI lifecycleStage itu sendiri) — sama pola dengan
// useEquipmentStatusCounts, dipakai ringkasan jumlah per tahap di atas list.
export function useWorkOrderStageCounts(params: WorkOrderQueryParams) {
  return useQuery({
    queryKey: [WORK_ORDER_KEY, 'stage-counts', params],
    queryFn: () => fetchWorkOrderStageCounts(params),
    placeholderData: (prev) => prev,
  });
}

export function useWorkOrderById(id: string | undefined) {
  return useQuery({
    queryKey: [WORK_ORDER_KEY, id],
    queryFn: () => fetchWorkOrderById(id as string),
    enabled: Boolean(id),
  });
}

// Daftar distinct Order Type (dari data yang sudah ter-import) — dipakai dropdown filter
// di list page. staleTime panjang: nilainya cuma bertambah lewat import ERP, jarang berubah.
export function useWorkOrderOrderTypes() {
  return useQuery({
    queryKey: [WORK_ORDER_KEY, 'order-types'],
    queryFn: fetchWorkOrderOrderTypes,
    staleTime: 5 * 60_000,
  });
}

// Dropdown WO milik satu equipment — dipakai field link di form Corrective Maintenance.
export function useWorkOrderDropdown(equipmentId: string | undefined) {
  return useQuery({
    queryKey: [WORK_ORDER_KEY, 'dropdown', equipmentId],
    queryFn: () => fetchWorkOrderDropdownByEquipment(equipmentId as string),
    enabled: Boolean(equipmentId),
  });
}

export function useRelinkWorkOrderEquipment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, equipmentId }: { id: string; equipmentId: string | null }) => relinkWorkOrderEquipment(id, equipmentId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [WORK_ORDER_KEY] }),
  });
}

// Tahap 1 — belum mengubah data, tidak invalidate list.
export function usePreviewWorkOrderImport() {
  return useMutation({
    mutationFn: (file: File) => previewWorkOrderImport(file),
  });
}

export function useWorkOrderImportRows(
  batchId: string | null,
  params: { severity?: ImportRowSeverity; page: number; limit: number },
) {
  return useQuery({
    queryKey: ['work-order-import-rows', batchId, params],
    queryFn: () => fetchWorkOrderImportRows(batchId as string, params),
    enabled: Boolean(batchId),
    placeholderData: (prev) => prev,
  });
}

// Tahap 2 — baru di sini data benar-benar berubah.
export function useCommitWorkOrderImport() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (batchId: string) => commitWorkOrderImport(batchId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [WORK_ORDER_KEY] }),
  });
}

// Hitung cepat jumlah "Antrian Belum Terhubung" (limit=1, cuma butuh meta.total) — dipakai
// kartu alert di Dashboard utama, bukan list rows. `enabled` dikontrol pemanggil (gate
// permission WORK_ORDER view) supaya tidak fetch untuk role yang tidak punya akses modul ini.
export function useWorkOrderUnmatchedCount(enabled: boolean) {
  return useQuery({
    queryKey: [WORK_ORDER_KEY, 'unmatched-count'],
    queryFn: async () => (await fetchWorkOrders({ page: 1, limit: 1, unmatchedOnly: true })).meta.total,
    enabled,
    staleTime: 60_000,
  });
}
