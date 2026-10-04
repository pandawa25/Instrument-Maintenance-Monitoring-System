import { api } from '@/lib/axios';
import type { PaginatedResult } from '@/lib/types';
import type {
  BulkEditCommitResult,
  BulkEditFieldsValues,
  BulkEditPreviewResult,
  BulkOperationListItem,
  Equipment,
  EquipmentFormValues,
  EquipmentQueryParams,
  EquipmentStatusCounts,
  ImportBatchRow,
  ImportCommitResult,
  ImportMode,
  ImportPreviewResult,
  ImportRowSeverity,
  RevertCommitResult,
  RevertPreviewResult,
} from '../types/equipment.types';

function cleanParams(params: EquipmentQueryParams) {
  return {
    ...params,
    areaId: params.areaId || undefined,
    instrumentNameId: params.instrumentNameId || undefined,
    manufacturer: params.manufacturer || undefined,
    criticality: params.criticality || undefined,
    status: params.status || undefined,
  };
}

export async function fetchEquipment(params: EquipmentQueryParams) {
  const { data } = await api.get<PaginatedResult<Equipment>>('/equipment', { params: cleanParams(params) });
  return data;
}

export async function fetchEquipmentStatusCounts(params: EquipmentQueryParams) {
  const { data } = await api.get<{ data: EquipmentStatusCounts }>('/equipment/dashboard/status-counts', {
    params: cleanParams(params),
  });
  return data.data;
}

export async function fetchManufacturers() {
  const { data } = await api.get<{ data: string[] }>('/equipment/manufacturers');
  return data.data;
}

export async function exportEquipment(params: EquipmentQueryParams) {
  const response = await api.get('/equipment/export', { params: cleanParams(params), responseType: 'blob' });
  const url = window.URL.createObjectURL(new Blob([response.data]));
  const link = document.createElement('a');
  link.href = url;
  link.download = `equipment-${new Date().toISOString().slice(0, 10)}.xlsx`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
}

export async function fetchEquipmentById(id: string) {
  const { data } = await api.get<{ data: Equipment }>(`/equipment/${id}`);
  return data.data;
}

export async function createEquipment(payload: EquipmentFormValues) {
  const { data } = await api.post<{ data: Equipment }>('/equipment', payload);
  return data.data;
}

export async function updateEquipment(id: string, payload: Partial<EquipmentFormValues>) {
  const { data } = await api.patch<{ data: Equipment }>(`/equipment/${id}`, payload);
  return data.data;
}

export async function deleteEquipment(id: string) {
  await api.delete(`/equipment/${id}`);
}

export async function downloadBulkUploadTemplate() {
  const response = await api.get('/equipment/bulk-upload/template', { responseType: 'blob' });
  const url = window.URL.createObjectURL(new Blob([response.data]));
  const link = document.createElement('a');
  link.href = url;
  link.download = 'equipment-bulk-upload-template.xlsx';
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
}

// Tahap 1: upload + validasi (maks 1000 baris). Belum menyimpan apa pun ke equipment —
// cuma menghasilkan batchId untuk ditinjau, lalu di-commit terpisah. mode default
// CREATE_ONLY (tag existing ditolak) — kirim 'UPDATE_OR_CREATE' untuk upsert by tag number.
export async function previewBulkEquipment(file: File, mode: ImportMode = 'CREATE_ONLY') {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('mode', mode);
  const { data } = await api.post<{ data: ImportPreviewResult }>('/equipment/bulk-upload/preview', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data.data;
}

export async function fetchImportBatchRows(
  batchId: string,
  params: { severity?: ImportRowSeverity; page: number; limit: number },
) {
  const { data } = await api.get<PaginatedResult<ImportBatchRow>>(`/equipment/bulk-upload/${batchId}/rows`, {
    params,
  });
  return data;
}

// Tahap 2: commit batch yang sudah di-preview. Ditolak backend kalau masih ada baris ERROR.
export async function commitBulkImport(batchId: string) {
  const { data } = await api.post<{ data: ImportCommitResult }>(`/equipment/bulk-upload/${batchId}/commit`);
  return data.data;
}

// ---- Edit Massal ----

export async function previewBulkEdit(ids: string[], fields: BulkEditFieldsValues) {
  const { data } = await api.post<{ data: BulkEditPreviewResult }>('/equipment/bulk-edit/preview', {
    ids,
    data: fields,
  });
  return data.data;
}

export async function commitBulkEdit(ids: string[], fields: BulkEditFieldsValues) {
  const { data } = await api.post<{ data: BulkEditCommitResult }>('/equipment/bulk-edit/commit', {
    ids,
    data: fields,
  });
  return data.data;
}

// ---- Rollback (Admin only di backend) ----

export async function fetchBulkOperations() {
  const { data } = await api.get<{ data: BulkOperationListItem[] }>('/equipment/bulk-operations');
  return data.data;
}

export async function previewRevert(operationId: string) {
  const { data } = await api.post<{ data: RevertPreviewResult }>(
    `/equipment/bulk-operations/${operationId}/revert/preview`,
  );
  return data.data;
}

export async function commitRevert(operationId: string) {
  const { data } = await api.post<{ data: RevertCommitResult }>(
    `/equipment/bulk-operations/${operationId}/revert/commit`,
  );
  return data.data;
}
