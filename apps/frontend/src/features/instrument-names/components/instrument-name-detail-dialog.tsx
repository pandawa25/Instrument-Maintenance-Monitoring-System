import { DetailDialog, type DetailField } from '@/components/shared/detail-dialog';
import type { InstrumentName } from '../types/instrument-name.types';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  instrumentName: InstrumentName | null;
}

export function InstrumentNameDetailDialog({ open, onOpenChange, instrumentName }: Props) {
  if (!instrumentName) return null;

  const fields: DetailField[] = [
    { label: 'Code', value: instrumentName.code },
    { label: 'Name', value: instrumentName.name },
    { label: 'Description', value: instrumentName.description, fullWidth: true },
    { label: 'Total Equipment', value: instrumentName.totalEquipment },
    { label: 'Dibuat Pada', value: new Date(instrumentName.createdAt).toLocaleString('id-ID') },
    { label: 'Terakhir Diubah', value: new Date(instrumentName.updatedAt).toLocaleString('id-ID') },
  ];

  return (
    <DetailDialog
      open={open}
      onOpenChange={onOpenChange}
      title={`Detail Instrument Name — ${instrumentName.code}`}
      fields={fields}
    />
  );
}
