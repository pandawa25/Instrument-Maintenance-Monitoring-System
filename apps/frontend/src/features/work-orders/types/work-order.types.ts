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

// IMPORT = equipmentId hasil auto-match saat import (boleh ditimpa import berikutnya).
// MANUAL = pernah dikoreksi lewat dialog "Hubungkan Equipment" — import berikutnya tidak
// akan menimpanya lagi. Lihat WorkOrder.equipmentLinkSource di schema.prisma.
export type WorkOrderEquipmentLinkSource = 'IMPORT' | 'MANUAL';

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
  equipmentLinkSource: WorkOrderEquipmentLinkSource;
  // Catatan manual internal (bukan field ERP) — lihat WorkOrder.remarks di schema.prisma.
  remarks: string | null;
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

// Info batch import ERP COMMITTED paling baru — ditampilkan di atas list ("Data terakhir
// diupdate ..."). Semua field null kalau belum pernah ada import yang commit sama sekali.
export interface WorkOrderLastImportInfo {
  committedAt: string | null;
  filename: string | null;
  totalRows: number | null;
  okRows: number | null;
  warningRows: number | null;
  errorRows: number | null;
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
