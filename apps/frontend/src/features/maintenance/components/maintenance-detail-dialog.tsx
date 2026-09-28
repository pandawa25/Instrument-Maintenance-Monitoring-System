import { DetailDialog, type DetailField } from '@/components/shared/detail-dialog';
import { StatusBadge } from '@/components/shared/status-badge';
import type { Maintenance } from '../types/maintenance.types';

const FAILURE_CATEGORY_LABEL: Record<Maintenance['failureCategory'], string> = {
  INSTRUMENT: 'Instrument',
  ELECTRICAL: 'Electrical',
  MECHANICAL: 'Mechanical',
  COMMUNICATION: 'Communication',
  CONFIGURATION: 'Configuration',
  CALIBRATION: 'Calibration',
  PROCESS: 'Process',
};

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  maintenance: Maintenance | null;
}

export function MaintenanceDetailDialog({ open, onOpenChange, maintenance }: Props) {
  if (!maintenance) return null;

  const fields: DetailField[] = [
    { label: 'Maintenance Date', value: new Date(maintenance.maintenanceDate).toLocaleDateString('id-ID') },
    {
      label: 'Equipment',
      value: `${maintenance.equipment.tagNumber} — ${maintenance.equipment.service}`,
    },
    { label: 'Area', value: `${maintenance.area.areaCode} — ${maintenance.area.areaName}` },
    { label: 'Failure Category', value: FAILURE_CATEGORY_LABEL[maintenance.failureCategory] },
    { label: 'Technician', value: maintenance.technician.fullName },
    { label: 'Problem Description', value: maintenance.problemDescription, fullWidth: true },
    { label: 'Root Cause', value: maintenance.rootCause, fullWidth: true },
    { label: 'Action Taken', value: maintenance.actionTaken, fullWidth: true },
    {
      label: 'Downtime Hours',
      value: maintenance.downtimeHours !== null ? `${maintenance.downtimeHours} jam` : null,
    },
    { label: 'Status', value: <StatusBadge value={maintenance.status} /> },
    {
      label: 'Completion Date',
      value: maintenance.completionDate ? new Date(maintenance.completionDate).toLocaleDateString('id-ID') : null,
    },
    { label: 'Dicatat Oleh', value: maintenance.createdBy.fullName },
    { label: 'Remarks', value: maintenance.remarks, fullWidth: true },
    { label: 'Dibuat Pada', value: new Date(maintenance.createdAt).toLocaleString('id-ID') },
    { label: 'Terakhir Diubah', value: new Date(maintenance.updatedAt).toLocaleString('id-ID') },
  ];

  return (
    <DetailDialog
      open={open}
      onOpenChange={onOpenChange}
      title={`Detail Corrective Maintenance — ${maintenance.equipment.tagNumber}`}
      fields={fields}
    />
  );
}
