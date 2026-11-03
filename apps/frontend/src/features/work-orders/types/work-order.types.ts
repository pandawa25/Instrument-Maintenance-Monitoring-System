// Harus sinkron dengan WorkOrderLifecycleStage di apps/backend/prisma/schema.prisma.
export type WorkOrderLifecycleStage = 'CREATED' | 'RELEASED' | 'TECHNICALLY_COMPLETED' | 'CLOSED';

export const LIFECYCLE_STAGE_LABEL: Record<WorkOrderLifecycleStage, string> = {
  CREATED: 'Dibuat',
  RELEASED: 'Dirilis',
  TECHNICALLY_COMPLETED: 'Selesai Teknis',
  CLOSED: 'Ditutup',
};

export const LIFECYCLE_STAGE_ORDER: WorkOrderLifecycleStage[] = [
  'CREATED',
  'RELEASED',
  'TECHNICALLY_COMPLETED',
  'CLOSED',
];

export type StageCounts = Record<WorkOrderLifecycleStage, number>;

// 10 field final yang disepakati tampil di UI (lihat docs/design-notification-work-order.md §3) —
// field lain (biaya, planner, actual date, dsb) sengaja TIDAK ada di tipe ini untuk Phase 1.
export interface WorkOrder {
  id: string;
  orderNo: string;
  description: string;
  orderType: string | null;
  basicStartDate: string | null;
  basicFinDate: string | null;
  userStatus: string | null;
  systemStatus: string | null;
  lifecycleStage: WorkOrderLifecycleStage;
  functionalLocation: string | null;
  equipmentId: string | null;
  equipmentTagRaw: string | null;
  notification: { id: string; notificationNo: string } | null;
  equipment: {
    id: string;
    tagNumber: string;
    service: string;
    area: { id: string; areaCode: string; areaName: string };
  } | null;
}

export interface WorkOrderDetail extends WorkOrder {
  maintActivType: string | null;
  superiorOrderId: string | null;
  correctiveMaintenance: { id: string; spkNumber: string | null; maintenanceDate: string }[];
}

export interface WorkOrderQueryParams {
  page: number;
  limit: number;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  equipmentId?: string;
  areaId?: string;
  orderType?: string;
  lifecycleStage?: WorkOrderLifecycleStage;
  dateFrom?: string;
  dateTo?: string;
  unmatchedOnly?: boolean;
}

export interface WorkOrderDropdownItem {
  id: string;
  orderNo: string;
  description: string;
  notification: { notificationNo: string } | null;
}

export type ImportRowSeverity = 'OK' | 'WARNING' | 'ERROR';

export interface WoImportPreviewResult {
  batchId: string;
  filename: string;
  totalRows: number;
  okRows: number;
  warningRows: number;
  errorRows: number;
  expiresAt: string;
  canCommit: boolean;
}

export interface WoImportCommitResult {
  batchId: string;
  status: string;
  notificationCount: number;
  workOrderCount: number;
  unmatchedCount: number;
  committedAt: string;
}

export interface WoImportBatchRow {
  rowNumber: number;
  severity: ImportRowSeverity;
  messages: string[];
  raw: Record<string, unknown>;
}
