import { api } from '@/lib/axios';
import type { PaginatedResult } from '@/lib/types';
import type {
  ImportRowSeverity,
  StageCounts,
  WoImportBatchRow,
  WoImportCommitResult,
  WoImportPreviewResult,
  WorkOrder,
  WorkOrderDetail,
  WorkOrderDropdownItem,
  WorkOrderQueryParams,
} from '../types/work-order.types';

function cleanParams(params: WorkOrderQueryParams) {
  return {
    ...params,
    equipmentId: params.equipmentId || undefined,
    areaId: params.areaId || undefined,
    orderType: params.orderType || undefined,
    lifecycleStage: params.lifecycleStage || undefined,
    dateFrom: params.dateFrom || undefined,
    dateTo: params.dateTo || undefined,
    unmatchedOnly: params.unmatchedOnly || undefined,
  };
}

export async function fetchWorkOrders(params: WorkOrderQueryParams) {
  const { data } = await api.get<PaginatedResult<WorkOrder>>('/work-orders', { params: cleanParams(params) });
  return data;
}

export async function fetchWorkOrderStageCounts(params: WorkOrderQueryParams) {
  const { data } = await api.get<{ data: StageCounts }>('/work-orders/stage-counts', { params: cleanParams(params) });
  return data.data;
}

export async function fetchWorkOrderById(id: string) {
  const { data } = await api.get<{ data: WorkOrderDetail }>(`/work-orders/${id}`);
  return data.data;
}

export async function fetchWorkOrderDropdownByEquipment(equipmentId: string) {
  const { data } = await api.get<{ data: WorkOrderDropdownItem[] }>('/work-orders/dropdown', { params: { equipmentId } });
  return data.data;
}

export async function fetchWorkOrderOrderTypes() {
  const { data } = await api.get<{ data: string[] }>('/work-orders/order-types');
  return data.data;
}

export async function relinkWorkOrderEquipment(id: string, equipmentId: string | null) {
  const { data } = await api.patch<{ data: WorkOrder }>(`/work-orders/${id}/equipment-link`, { equipmentId });
  return data.data;
}

// ---- Import (Admin only di backend) ----

export async function previewWorkOrderImport(file: File) {
  const formData = new FormData();
  formData.append('file', file);
  const { data } = await api.post<{ data: WoImportPreviewResult }>('/work-orders/import/preview', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data.data;
}

export async function fetchWorkOrderImportRows(
  batchId: string,
  params: { severity?: ImportRowSeverity; page: number; limit: number },
) {
  const { data } = await api.get<PaginatedResult<WoImportBatchRow>>(`/work-orders/import/${batchId}/rows`, { params });
  return data;
}

export async function commitWorkOrderImport(batchId: string) {
  const { data } = await api.post<{ data: WoImportCommitResult }>(`/work-orders/import/${batchId}/commit`);
  return data.data;
}
