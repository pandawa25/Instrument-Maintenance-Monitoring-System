import { WorkOrderLifecycleStage } from '@prisma/client';

/**
 * Judul kolom PERSIS seperti export SAP PM yang dianalisis (lihat
 * docs/design-notification-work-order.md §2 — file "WO 01012026.xlsx", 36 kolom).
 * Dipakai untuk mencari posisi kolom di baris header (row 1) saat parsing — BUKAN posisi
 * tetap by-index, supaya tahan terhadap export yang kolomnya sedikit bergeser urutan tapi
 * judulnya tetap sama. Hanya 11 kolom yang benar-benar kita pakai (lihat §3 design doc);
 * kolom lain di export (Material, PO number, dst) diabaikan.
 */
export const SAP_COLUMN_HEADERS = {
  notification: 'Notification',
  order: 'Order',
  description: 'Description',
  functionalLocation: 'Functional Loc.',
  equipment: 'Equipment',
  location: 'Location',
  plant: 'Plant',
  orderType: 'Order Type',
  userStatus: 'User status',
  systemStatus: 'System status',
  basicStartDate: 'Bas. start date',
  basicFinDate: 'Basic fin. date',
  maintActivType: 'MaintActivType',
  createdOn: 'Created on',
} as const;

/**
 * Token pertama System Status ERP -> tahap siklus kita. Terverifikasi saling eksklusif
 * (selalu tepat satu token lifecycle per baris, selalu token pertama) di seluruh data
 * sample — lihat design doc §2. Token lain (CNF, NMAT, MSPT, PRC, dst) adalah flag paralel,
 * TIDAK termasuk di map ini — ditampilkan sebagai badge tambahan di UI, bukan bagian stepper.
 */
const LIFECYCLE_TOKEN_MAP: Record<string, WorkOrderLifecycleStage> = {
  CRTD: 'CREATED',
  REL: 'RELEASED',
  TECO: 'TECHNICALLY_COMPLETED',
  CLSD: 'CLOSED',
};

/**
 * Ambil token pertama dari string System Status ERP (mis. "CLSD CNF CSER NMAT PRC SETC"
 * -> "CLSD") lalu map ke WorkOrderLifecycleStage. Token tidak dikenali/kosong -> fallback
 * CREATED (bukan tebakan — baris tetap ter-import dengan WARNING, lihat
 * WorkOrderImportService.validateRow()).
 */
export function deriveLifecycleStage(systemStatus: string | undefined | null): {
  stage: WorkOrderLifecycleStage;
  recognized: boolean;
} {
  const firstToken = systemStatus?.trim().split(/\s+/)[0]?.toUpperCase();
  if (firstToken && firstToken in LIFECYCLE_TOKEN_MAP) {
    return { stage: LIFECYCLE_TOKEN_MAP[firstToken], recognized: true };
  }
  return { stage: 'CREATED', recognized: false };
}
