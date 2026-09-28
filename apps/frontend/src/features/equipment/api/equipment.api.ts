import { api } from '@/lib/axios';
import type { PaginatedResult } from '@/lib/types';
import type {
  BulkUploadResult,
  Equipment,
  EquipmentFormValues,
  EquipmentQueryParams,
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

export async function uploadBulkEquipment(file: File) {
  const formData = new FormData();
  formData.append('file', file);
  // Endpoint single-resource -> dibungkus ResponseTransformInterceptor jadi { data: BulkUploadResult }.
  const { data } = await api.post<{ data: BulkUploadResult }>('/equipment/bulk-upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data.data;
}
