import { Building2 } from 'lucide-react';
import { DetailDialog, type DetailField } from '@/components/shared/detail-dialog';
import { StatusBadge } from '@/components/shared/status-badge';
import type { Vendor } from '../types/vendor.types';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  vendor: Vendor | null;
}

export function VendorDetailDialog({ open, onOpenChange, vendor }: Props) {
  if (!vendor) return null;

  const fields: DetailField[] = [
    { label: 'Nama Vendor', value: vendor.name },
    { label: 'Contact Person', value: vendor.contactPerson },
    { label: 'Phone', value: vendor.phone },
    { label: 'Email', value: vendor.email },
    { label: 'Address', value: vendor.address, fullWidth: true },
    { label: 'Status', value: <StatusBadge value={vendor.status} /> },
    { label: 'Total PM Program', value: vendor.totalPmProgram },
    { label: 'Remarks', value: vendor.remarks, fullWidth: true },
    { label: 'Dibuat Pada', value: new Date(vendor.createdAt).toLocaleString('id-ID') },
    { label: 'Terakhir Diubah', value: new Date(vendor.updatedAt).toLocaleString('id-ID') },
  ];

  return (
    <DetailDialog
      open={open}
      onOpenChange={onOpenChange}
      icon={Building2}
      title="Detail Vendor"
      subtitle={vendor.name}
      fields={fields}
    />
  );
}
