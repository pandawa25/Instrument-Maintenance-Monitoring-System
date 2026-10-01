import { Gauge } from 'lucide-react';
import { DetailDialog, type DetailField } from '@/components/shared/detail-dialog';
import { StatusBadge } from '@/components/shared/status-badge';
import { FAIL_ACTION_LABEL, isValveInstrumentCode, type Equipment } from '../types/equipment.types';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  equipment: Equipment | null;
}

export function EquipmentDetailDialog({ open, onOpenChange, equipment }: Props) {
  if (!equipment) return null;

  const isValve = isValveInstrumentCode(equipment.instrumentName.code);

  // Equipment valve (CV/SV/KV/UV) pakai Size/Rating/Fail Action; equipment lain pakai
  // LRV/URV/Unit — lihat revisi "Module Equipment valve fields".
  const valveOrRangeFields: DetailField[] = isValve
    ? [
        { label: 'Size', value: equipment.size },
        { label: 'Rating', value: equipment.rating },
        { label: 'Fail Action', value: equipment.failAction ? FAIL_ACTION_LABEL[equipment.failAction] : null },
      ]
    : [
        { label: 'LRV', value: equipment.lrv !== null && equipment.lrv !== undefined ? String(equipment.lrv) : null },
        { label: 'URV', value: equipment.urv !== null && equipment.urv !== undefined ? String(equipment.urv) : null },
        { label: 'Unit', value: equipment.unit },
      ];

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
    ...valveOrRangeFields,
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
      icon={Gauge}
      title="Detail Equipment"
      subtitle={equipment.tagNumber}
      fields={fields}
    />
  );
}
