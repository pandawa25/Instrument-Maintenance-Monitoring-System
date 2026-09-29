import { Pencil, Trash2, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/shared/status-badge';
import type { Vendor } from '../types/vendor.types';

interface Props {
  vendors: Vendor[];
  isLoading: boolean;
  canEdit: boolean;
  onEdit: (vendor: Vendor) => void;
  onDelete: (vendor: Vendor) => void;
  onView: (vendor: Vendor) => void;
}

export function VendorTable({ vendors, isLoading, canEdit, onEdit, onDelete, onView }: Props) {
  if (isLoading) {
    return <div className="p-8 text-center text-sm text-text-muted">Memuat data...</div>;
  }

  if (vendors.length === 0) {
    return <div className="p-8 text-center text-sm text-text-muted">Belum ada data vendor.</div>;
  }

  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="border-b border-border bg-surface-2 text-left text-xs uppercase tracking-wide text-text-muted">
          <th className="px-4 py-2.5 font-medium">Nama Vendor</th>
          <th className="px-4 py-2.5 font-medium">Contact Person</th>
          <th className="px-4 py-2.5 font-medium">Phone</th>
          <th className="px-4 py-2.5 font-medium text-center">Total PM Program</th>
          <th className="px-4 py-2.5 font-medium">Status</th>
          <th className="px-4 py-2.5 font-medium text-right">Action</th>
        </tr>
      </thead>
      <tbody>
        {vendors.map((vendor) => (
          <tr key={vendor.id} className="border-b border-border last:border-0 hover:bg-surface-2/60">
            <td className="px-4 py-2.5 text-text">{vendor.name}</td>
            <td className="px-4 py-2.5 text-text-muted">{vendor.contactPerson || '—'}</td>
            <td className="px-4 py-2.5 text-text-muted">{vendor.phone || '—'}</td>
            <td className="px-4 py-2.5 text-center text-text">{vendor.totalPmProgram}</td>
            <td className="px-4 py-2.5">
              <StatusBadge value={vendor.status} />
            </td>
            <td className="px-4 py-2.5">
              <div className="flex justify-end gap-1">
                <Button variant="ghost" size="icon" onClick={() => onView(vendor)} title="View detail">
                  <Eye className="h-4 w-4" />
                </Button>
                {canEdit && (
                  <>
                    <Button variant="ghost" size="icon" onClick={() => onEdit(vendor)} title="Edit">
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => onDelete(vendor)} title="Delete">
                      <Trash2 className="h-4 w-4 text-danger" />
                    </Button>
                  </>
                )}
              </div>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
