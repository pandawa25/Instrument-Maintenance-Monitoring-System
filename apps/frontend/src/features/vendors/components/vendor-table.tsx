import { Pencil, Trash2, Eye, Building2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/shared/status-badge';
import { LoadingState } from '@/components/shared/loading-state';
import { EmptyState } from '@/components/shared/empty-state';
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
    return <LoadingState />;
  }

  if (vendors.length === 0) {
    return <EmptyState icon={Building2} message="Belum ada data vendor." />;
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
                <Button variant="ghost" size="icon" onClick={() => onView(vendor)} title="View detail" aria-label="View detail">
                  <Eye className="h-4 w-4" />
                </Button>
                {canEdit && (
                  <>
                    <Button variant="ghost" size="icon" onClick={() => onEdit(vendor)} title="Edit" aria-label="Edit">
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => onDelete(vendor)} title="Delete" aria-label="Delete">
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
