export type EquipmentStatus = 'ACTIVE' | 'STANDBY' | 'OUT_OF_SERVICE';
export type Criticality = 'HIGH' | 'MEDIUM' | 'LOW';
export type FailAction = 'CLOSE' | 'OPEN' | 'LAST_POSITION';

export const FAIL_ACTION_LABEL: Record<FailAction, string> = {
  CLOSE: 'Close',
  OPEN: 'Open',
  LAST_POSITION: 'Last Position',
};

// Kode instrument_names yang merupakan tipe valve — equipment dengan kode ini memakai
// field Size/Rating/Fail Action, BUKAN LRV/URV/Unit (revisi Module Equipment valve fields):
// Control Valve (CV), Solenoid Valve (SV), On-Off Valve (KV), On-Off Valve SIS (UV).
export const VALVE_INSTRUMENT_CODES = ['CV', 'SV', 'KV', 'UV'] as const;

export function isValveInstrumentCode(code: string | null | undefined): boolean {
  return !!code && (VALVE_INSTRUMENT_CODES as readonly string[]).includes(code);
}

export interface InstrumentNameRef {
  id: string;
  code: string;
  name: string;
}

export interface AreaRef {
  id: string;
  areaCode: string;
  areaName: string;
}

export interface Equipment {
  id: string;
  tagNumber: string;
  service: string;
  description: string | null;
  area: AreaRef;
  instrumentName: InstrumentNameRef;
  type: string | null;
  manufacturer: string | null;
  model: string | null;
  serialNumber: string | null;
  installationDate: string | null;
  lrv: number | string | null;
  urv: number | string | null;
  unit: string | null;
  size: string | null;
  rating: string | null;
  failAction: FailAction | null;
  status: EquipmentStatus;
  criticality: Criticality;
  remarks: string | null;
  lastMaintenanceDate: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface EquipmentFormValues {
  tagNumber: string;
  service: string;
  description?: string;
  areaId: string;
  instrumentNameId: string;
  type?: string;
  manufacturer?: string;
  model?: string;
  serialNumber?: string;
  installationDate?: string;
  lrv?: number | string;
  urv?: number | string;
  unit?: string;
  size?: string;
  rating?: string;
  failAction?: FailAction | '';
  status: EquipmentStatus;
  criticality: Criticality;
  remarks?: string;
}

export type ImportRowSeverity = 'OK' | 'WARNING' | 'ERROR';
export type ImportBatchStatus = 'VALIDATED' | 'COMMITTED' | 'FAILED' | 'EXPIRED';

// Tahap 1 (preview) — belum ada yang disimpan ke equipment. batchId dipakai untuk
// lihat baris & commit di tahap 2.
export interface ImportPreviewResult {
  batchId: string;
  filename: string;
  totalRows: number;
  okRows: number;
  warningRows: number;
  errorRows: number;
  expiresAt: string;
  canCommit: boolean;
}

export interface ImportBatchRow {
  rowNumber: number;
  severity: ImportRowSeverity;
  messages: string[];
  raw: Record<string, unknown>;
}

// Tahap 2 (commit) — hasil akhir setelah insert benar-benar terjadi.
export interface ImportCommitResult {
  batchId: string;
  status: ImportBatchStatus;
  createdCount: number;
  committedAt: string;
}

export interface EquipmentQueryParams {
  page: number;
  limit: number;
  search?: string;
  areaId?: string | '';
  instrumentNameId?: string | '';
  manufacturer?: string | '';
  criticality?: Criticality | '';
  status?: EquipmentStatus | '';
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export type EquipmentStatusCounts = Record<'ALL' | EquipmentStatus, number>;
