import { api } from '@/lib/axios';
import type { PaginatedResult } from '@/lib/types';
import type {
  Equipment,
  EquipmentFormValues,
  EquipmentQueryParams,
  ImportBatchRow,
  ImportCommitResult,
  ImportPreviewResult,
  ImportRowSeverity,
} from '../types/equipment.types';

export async function fetchEquipment(params: EquipmentQueryParams) {
  const { data } = await api.get<PaginatedResult<Equipment>>('/equipment', {
    params: {
      ...params,
      areaId: params.areaId || undefined,
      instrumentNameId: params.instrumentNameId || undefined,
      status: params.status || undefined,
    },
  });
  return data;
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

// Tahap 1: upload + validasi (create-only, maks 1000 baris). Belum menyimpan apa pun ke
// equipment — cuma menghasilkan batchId untuk ditinjau, lalu di-commit terpisah.
export async function previewBulkEquipment(file: File) {
  const formData = new FormData();
  formData.append('file', file);
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
