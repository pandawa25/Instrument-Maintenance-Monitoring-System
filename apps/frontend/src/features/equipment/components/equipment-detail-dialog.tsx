import { DetailDialog, type DetailField } from '@/components/shared/detail-dialog';
import { StatusBadge } from '@/components/shared/status-badge';
import type { Equipment } from '../types/equipment.types';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  equipment: Equipment | null;
}

export function EquipmentDetailDialog({ open, onOpenChange, equipment }: Props) {
  if (!equipment) return null;

  const fields: DetailField[] = [
    { label: 'Tag Number', value: equipment.tagNumber },
    { label: 'Service', value: equipment.service },
    { label: 'Description', value: equipment.description, fullWidth: true },
    { label: 'Area', value: `${equipment.area.areaCode} — ${equipment.area.areaName}` },
    { label: 'Instrument Name', value: equipment.instrumentName.name },
    { label: 'Type', value: equipment.type },
    { label: 'Manufacturer', value: equipment.manufacturer },
    { label: 'Model', value: equipment.model },
    { label: 'Serial Number', value: equipment.serialNumber },
    {
      label: 'Installation Date',
      value: equipment.installationDate ? new Date(equipment.installationDate).toLocaleDateString('id-ID') : null,
    },
    { label: 'Status', value: <StatusBadge value={equipment.status} /> },
    { label: 'Criticality', value: <StatusBadge value={equipment.criticality} /> },
    {
      label: 'Last Maintenance',
      value: equipment.lastMaintenanceDate
        ? new Date(equipment.lastMaintenanceDate).toLocaleDateString('id-ID')
        : null,
    },
    { label: 'Remarks', value: equipment.remarks, fullWidth: true },
    { label: 'Dibuat Pada', value: new Date(equipment.createdAt).toLocaleString('id-ID') },
    { label: 'Terakhir Diubah', value: new Date(equipment.updatedAt).toLocaleString('id-ID') },
  ];

  return (
    <DetailDialog
      open={open}
      onOpenChange={onOpenChange}
      title={`Detail Equipment — ${equipment.tagNumber}`}
      fields={fields}
    />
  );
}
