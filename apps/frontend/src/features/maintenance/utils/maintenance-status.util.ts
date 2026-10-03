import type { MaintenanceFormValues } from '../types/maintenance.types';

type MaintenanceStatus = MaintenanceFormValues['status'];

export const MAINTENANCE_STATUS_LABELS: Record<MaintenanceStatus, string> = {
  OPEN: 'Open',
  IN_PROGRESS: 'In Progress',
  WAITING_MATERIAL: 'Waiting Material',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
};

/**
 * Cermin dari `ALLOWED_TRANSITIONS` di backend
 * (`apps/backend/src/modules/maintenance/maintenance-status.util.ts`) — dipakai
 * untuk menyembunyikan pilihan status yang pasti akan ditolak backend, supaya
 * user tidak perlu submit dulu baru tahu transisinya invalid. Backend tetap
 * jadi sumber kebenaran/validasi utama; daftar ini HARUS disinkronkan manual
 * kalau aturan transisi di backend berubah.
 */
const ALLOWED_TRANSITIONS: Record<MaintenanceStatus, MaintenanceStatus[]> = {
  OPEN: ['IN_PROGRESS', 'WAITING_MATERIAL', 'CANCELLED'],
  IN_PROGRESS: ['WAITING_MATERIAL', 'COMPLETED', 'CANCELLED'],
  WAITING_MATERIAL: ['IN_PROGRESS', 'CANCELLED'],
  COMPLETED: [],
  CANCELLED: [],
};

/**
 * Status yang boleh dipilih di dropdown edit — status saat ini SELALU ikut
 * (supaya form tidak langsung "nyangkut" kalau user tidak mengubah status),
 * ditambah status tujuan yang transisinya diizinkan.
 */
export function getSelectableStatuses(currentStatus: MaintenanceStatus): MaintenanceStatus[] {
  return [currentStatus, ...ALLOWED_TRANSITIONS[currentStatus]];
}
