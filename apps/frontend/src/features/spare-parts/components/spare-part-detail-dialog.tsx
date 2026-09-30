import { PackageSearch } from 'lucide-react';
import { DetailDialog, type DetailField } from '@/components/shared/detail-dialog';
import { StatusBadge } from '@/components/shared/status-badge';
import type { SparePart } from '../types/spare-part.types';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sparePart: SparePart | null;
}

export function SparePartDetailDialog({ open, onOpenChange, sparePart }: Props) {
  if (!sparePart) return null;

  const fields: DetailField[] = [
    { label: 'KIMAP', value: sparePart.kimap },
    { label: 'Nama Material', value: sparePart.name },
    { label: 'Stock', value: sparePart.stock },
    { label: 'Unit', value: sparePart.unit },
    { label: 'Status', value: <StatusBadge value={sparePart.status} /> },
    { label: 'Remarks', value: sparePart.remarks, fullWidth: true },
    { label: 'Dibuat Pada', value: new Date(sparePart.createdAt).toLocaleString('id-ID') },
    { label: 'Terakhir Diubah', value: new Date(sparePart.updatedAt).toLocaleString('id-ID') },
  ];

  return (
    <DetailDialog
      open={open}
      onOpenChange={onOpenChange}
      icon={PackageSearch}
      title="Detail Spare Part / Material"
      subtitle={sparePart.kimap}
      fields={fields}
    />
  );
}
