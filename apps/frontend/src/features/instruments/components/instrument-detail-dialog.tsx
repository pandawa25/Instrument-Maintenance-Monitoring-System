import { DetailDialog, type DetailField } from '@/components/shared/detail-dialog';
import { StatusBadge } from '@/components/shared/status-badge';
import type { Instrument } from '../types/instrument.types';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  instrument: Instrument | null;
}

export function InstrumentDetailDialog({ open, onOpenChange, instrument }: Props) {
  if (!instrument) return null;

  const fields: DetailField[] = [
    { label: 'Tag Number', value: instrument.tagNumber },
    { label: 'Instrument Name', value: instrument.instrumentName },
    { label: 'Description', value: instrument.description, fullWidth: true },
    { label: 'Area', value: `${instrument.area.areaCode} — ${instrument.area.areaName}` },
    { label: 'Instrument Type', value: instrument.instrumentType.typeName },
    { label: 'Manufacturer', value: instrument.manufacturer },
    { label: 'Model', value: instrument.model },
    { label: 'Serial Number', value: instrument.serialNumber },
    {
      label: 'Installation Date',
      value: instrument.installationDate ? new Date(instrument.installationDate).toLocaleDateString('id-ID') : null,
    },
    { label: 'Status', value: <StatusBadge value={instrument.status} /> },
    { label: 'Criticality', value: <StatusBadge value={instrument.criticality} /> },
    {
      label: 'Last Maintenance',
      value: instrument.lastMaintenanceDate
        ? new Date(instrument.lastMaintenanceDate).toLocaleDateString('id-ID')
        : null,
    },
    { label: 'Remarks', value: instrument.remarks, fullWidth: true },
    { label: 'Dibuat Pada', value: new Date(instrument.createdAt).toLocaleString('id-ID') },
    { label: 'Terakhir Diubah', value: new Date(instrument.updatedAt).toLocaleString('id-ID') },
  ];

  return (
    <DetailDialog
      open={open}
      onOpenChange={onOpenChange}
      title={`Detail Instrument — ${instrument.tagNumber}`}
      fields={fields}
    />
  );
}
