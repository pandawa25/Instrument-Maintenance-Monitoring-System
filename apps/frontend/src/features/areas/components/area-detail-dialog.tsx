import { DetailDialog, type DetailField } from '@/components/shared/detail-dialog';
import { StatusBadge } from '@/components/shared/status-badge';
import type { Area } from '../types/area.types';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  area: Area | null;
}

export function AreaDetailDialog({ open, onOpenChange, area }: Props) {
  if (!area) return null;

  const fields: DetailField[] = [
    { label: 'Area Code', value: area.areaCode },
    { label: 'Area Name', value: area.areaName },
    { label: 'Description', value: area.description, fullWidth: true },
    { label: 'Status', value: <StatusBadge value={area.status} /> },
    { label: 'Total Instrument', value: area.totalInstrument },
    { label: 'Dibuat Pada', value: new Date(area.createdAt).toLocaleString('id-ID') },
    { label: 'Terakhir Diubah', value: new Date(area.updatedAt).toLocaleString('id-ID') },
  ];

  return <DetailDialog open={open} onOpenChange={onOpenChange} title={`Detail Area — ${area.areaCode}`} fields={fields} />;
}
