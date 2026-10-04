// Harus persis sama dengan enum PermissionModule di apps/backend/prisma/schema.prisma
export type PermissionModule =
  | 'DASHBOARD'
  | 'AREA'
  | 'EQUIPMENT'
  | 'INSTRUMENT_NAME'
  | 'CORRECTIVE_MAINTENANCE'
  | 'VENDOR'
  | 'PM_ACTIVITY_TYPE'
  | 'PM_PROGRAM'
  | 'PM_EXECUTION'
  | 'SPARE_PART';

export type PermissionAction = 'view' | 'create' | 'edit' | 'delete';

export type PermissionsMap = Record<PermissionModule, Record<PermissionAction, boolean>>;

export const PERMISSION_MODULE_LABELS: Record<PermissionModule, string> = {
  DASHBOARD: 'Dashboard',
  AREA: 'Master Area',
  EQUIPMENT: 'Master Equipment',
  INSTRUMENT_NAME: 'Master Instrument Name',
  CORRECTIVE_MAINTENANCE: 'Corrective Maintenance',
  VENDOR: 'Master Vendor',
  PM_ACTIVITY_TYPE: 'PM Activity Type',
  PM_PROGRAM: 'Preventive Maintenance (Program)',
  PM_EXECUTION: 'Preventive Maintenance (Eksekusi)',
  SPARE_PART: 'Spare Part / Material',
};
