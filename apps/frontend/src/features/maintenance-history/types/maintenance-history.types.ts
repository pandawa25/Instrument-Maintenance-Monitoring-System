// Cermin bentuk response backend (apps/backend/src/modules/maintenance-history/history-timeline.util.ts).
// Sinkronkan manual kalau bentuk di backend berubah.

export type HistoryEventKind = 'CORRECTIVE' | 'PREVENTIVE';
export type HistoryTypeFilter = 'ALL' | HistoryEventKind;

export interface HistoryEquipmentOption {
  id: string;
  tagNumber: string;
  service: string;
  manufacturer: string | null;
  model: string | null;
  status: string;
  area: { id: string; areaCode: string; areaName: string };
  instrumentName: { id: string; code: string; name: string };
}

/** Baris "Top N" halaman awal: equipment dengan kegiatan maintenance (CM + PM Completed) terbanyak. */
export interface TopMaintenanceEquipment extends HistoryEquipmentOption {
  rank: number;
  correctiveCount: number;
  preventiveCount: number;
  totalCount: number;
  /** yyyy-mm-dd; null bila tanggal tidak tercatat. */
  lastMaintenanceDate: string | null;
}

export interface HistoryEquipmentHeader extends HistoryEquipmentOption {
  description: string | null;
  serialNumber: string | null;
  installationDate: string | null;
  criticality: string;
}

export interface HistoryMaterial {
  sparePartId: string;
  kimap: string;
  name: string;
  unit: string;
  quantity: number;
  remarks: string | null;
  /** true = stok benar-benar terpotong (Corrective Completed); false = baru kebutuhan. */
  consumed: boolean;
}

export interface CorrectiveDetail {
  spkNumber: string | null;
  failureCategory: string;
  priority: string;
  problemDescription: string;
  rootCause: string | null;
  actionTaken: string | null;
  downtimeHours: number | null;
  technician: string;
  additionalTechnicians: string[];
  completionDate: string | null;
  workOrderNumber: string | null;
  notificationNumber: string | null;
}

export interface PreventiveDetail {
  programId: string;
  programName: string;
  periodNumber: number;
  plannedDate: string;
  vendorName: string | null;
  result: string | null;
  findings: string | null;
  actionTaken: string | null;
  vendorPersonnel: string | null;
  workOrderNumber: string | null;
  checklistTotal: number;
  checklistNotOk: number;
}

export interface HistoryEvent {
  id: string;
  kind: HistoryEventKind;
  date: string;
  status: string;
  title: string;
  remarks: string | null;
  materials: HistoryMaterial[];
  corrective: CorrectiveDetail | null;
  preventive: PreventiveDetail | null;
  createdAt: string;
}

export interface MaterialUsageSummary {
  sparePartId: string;
  kimap: string;
  name: string;
  unit: string;
  totalQuantity: number;
  usageCount: number;
}

export interface HistorySummary {
  totalEvents: number;
  correctiveCount: number;
  preventiveCount: number;
  openCorrectiveCount: number;
  totalDowntimeHours: number;
  lastActivityDate: string | null;
  materialUsage: MaterialUsageSummary[];
}

export interface EquipmentHistory {
  equipment: HistoryEquipmentHeader;
  summary: HistorySummary;
  events: HistoryEvent[];
}

export interface HistoryFilters {
  type: HistoryTypeFilter;
  dateFrom: string;
  dateTo: string;
}
