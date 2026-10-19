import { api } from '@/lib/axios';
import type { PaginatedResult } from '@/lib/types';
import type {
  AllStockMovementItem,
  AllStockMovementsQueryParams,
  CreateStandaloneMovementPayload,
  CreateStockMovementPayload,
  InventoryCharts,
  InventorySummary,
  SparePart,
  SparePartFormValues,
  SparePartQueryParams,
  StockMovement,
  StockMovementQueryParams,
  BulkUploadCommitResult,
  BulkUploadMode,
  BulkUploadPreview,
} from '../types/spare-part.types';

export async function fetchSpareParts(params: SparePartQueryParams) {
  const { data } = await api.get<PaginatedResult<SparePart>>('/spare-parts', {
    params: { ...params, status: params.status || undefined },
  });
  return data;
}

export async function fetchSparePartById(id: string) {
  const { data } = await api.get<{ data: SparePart }>(`/spare-parts/${id}`);
  return data.data;
}

// Dropdown tanpa pagination — dibutuhkan penuh oleh multi-select material di
// form Corrective Maintenance, berapa pun jumlah spare part-nya.
export async function fetchSparePartsForDropdown() {
  const { data } = await api.get<{ data: SparePart[] }>('/spare-parts/dropdown');
  return data.data;
}

export async function createSparePart(payload: SparePartFormValues) {
  const { data } = await api.post<{ data: SparePart }>('/spare-parts', payload);
  return data.data;
}

export async function updateSparePart(id: string, payload: Partial<SparePartFormValues>) {
  const { data } = await api.patch<{ data: SparePart }>(`/spare-parts/${id}`, payload);
  return data.data;
}

export async function deleteSparePart(id: string) {
  await api.delete(`/spare-parts/${id}`);
}

export async function fetchStockMovements(sparePartId: string, params: StockMovementQueryParams) {
  const { data } = await api.get<PaginatedResult<StockMovement>>(`/spare-parts/${sparePartId}/stock-movements`, {
    params,
  });
  return data;
}

export async function createStockMovement(sparePartId: string, payload: CreateStockMovementPayload) {
  const { data } = await api.post<{ data: SparePart }>(`/spare-parts/${sparePartId}/stock-movements`, payload);
  return data.data;
}

// Ledger lintas spare part untuk halaman Stock In / Stock Out — `type` sudah
// ditentukan oleh endpoint-nya di backend, bukan dikirim dari sini.
export async function fetchStockIn(params: AllStockMovementsQueryParams) {
  const { data } = await api.get<PaginatedResult<AllStockMovementItem>>('/spare-parts/stock-in', { params });
  return data;
}

export async function fetchStockOut(params: AllStockMovementsQueryParams) {
  const { data } = await api.get<PaginatedResult<AllStockMovementItem>>('/spare-parts/stock-out', { params });
  return data;
}

// Dipakai halaman Stock In (type RESTOCK) & Stock Out (type STOCK_OUT) — spare part
// dipilih dulu oleh user di dialog, baru kirim ke endpoint generik per-part yang sudah ada.
export async function createStandaloneMovement(
  type: 'RESTOCK' | 'STOCK_OUT',
  payload: CreateStandaloneMovementPayload,
) {
  const { sparePartId, ...rest } = payload;
  const { data } = await api.post<{ data: SparePart }>(`/spare-parts/${sparePartId}/stock-movements`, {
    type,
    ...rest,
  });
  return data.data;
}

export async function fetchInventorySummary() {
  const { data } = await api.get<{ data: InventorySummary }>('/spare-parts/dashboard/summary');
  return data.data;
}

export async function fetchInventoryCharts(months?: number) {
  const { data } = await api.get<{ data: InventoryCharts }>('/spare-parts/dashboard/charts', {
    params: { months },
  });
  return data.data;
}

// ===== Bulk Upload (Admin only — backend @Roles('Admin')) =====
export async function downloadSparePartBulkTemplate() {
  const response = await api.get('/spare-parts/bulk-upload/template', { responseType: 'blob' });
  const url = window.URL.createObjectURL(new Blob([response.data]));
  const link = document.createElement('a');
  link.href = url;
  link.download = 'spare-part-bulk-upload-template.xlsx';
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
}

function bulkFormData(file: File, mode: BulkUploadMode) {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('mode', mode);
  return formData;
}

// Stateless: preview TIDAK menyimpan apa pun. Commit mengirim file yang sama dan divalidasi ulang di server.
export async function previewSparePartBulk(file: File, mode: BulkUploadMode) {
  const { data } = await api.post<{ data: BulkUploadPreview }>('/spare-parts/bulk-upload/preview', bulkFormData(file, mode), {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data.data;
}

export async function commitSparePartBulk(file: File, mode: BulkUploadMode) {
  const { data } = await api.post<{ data: BulkUploadCommitResult }>('/spare-parts/bulk-upload/commit', bulkFormData(file, mode), {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data.data;
}
