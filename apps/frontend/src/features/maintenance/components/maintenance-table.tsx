import { Pencil, Trash2, Eye, PackageSearch, Wrench } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/shared/status-badge';
import { LoadingState } from '@/components/shared/loading-state';
import { EmptyState } from '@/components/shared/empty-state';
import type { Maintenance } from '../types/maintenance.types';

interface Props {
  items: Maintenance[];
  isLoading: boolean;
  canEdit: boolean;
  onEdit: (item: Maintenance) => void;
  onDelete: (item: Maintenance) => void;
  onView: (item: Maintenance) => void;
}

export function MaintenanceTable({ items, isLoading, canEdit, onEdit, onDelete, onView }: Props) {
  if (isLoading) {
    return <LoadingState />;
  }

  if (items.length === 0) {
    return <EmptyState icon={Wrench} message="Belum ada data corrective maintenance." />;
  }

  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="border-b border-border bg-surface-2 text-left text-xs uppercase tracking-wide text-text-muted">
          <th className="px-4 py-2.5 font-medium">No. e-SPK</th>
          <th className="px-4 py-2.5 font-medium">Tanggal</th>
          <th className="px-4 py-2.5 font-medium">Tag Number</th>
          <th className="px-4 py-2.5 font-medium">Description</th>
          <th className="px-4 py-2.5 font-medium">Priority</th>
          <th className="px-4 py-2.5 font-medium">Status</th>
          <th className="px-4 py-2.5 font-medium">PIC</th>
          <th className="px-4 py-2.5 font-medium text-right">Aksi</th>
        </tr>
      </thead>
      <tbody>
        {items.map((item) => (
          <tr key={item.id} className="border-b border-border last:border-0 hover:bg-surface-2/60">
            <td className="px-4 py-2.5 font-mono text-xs font-medium text-primary">{item.spkNumber ?? '-'}</td>
            <td className="px-4 py-2.5 text-text-muted">
              {new Date(item.maintenanceDate).toLocaleDateString('id-ID')}
            </td>
            <td className="px-4 py-2.5 font-mono text-xs text-text">{item.equipment.tagNumber}</td>
            <td className="max-w-xs truncate px-4 py-2.5 text-text-muted" title={item.problemDescription}>
              <span className="inline-flex items-center gap-1.5">
                {item.needsSparePart && (
                  <span title="Butuh spare part / material">
                    <PackageSearch className="h-3.5 w-3.5 shrink-0 text-primary" />
                  </span>
                )}
                {item.problemDescription}
              </span>
            </td>
            <td className="px-4 py-2.5">
              <StatusBadge value={item.priority} />
            </td>
            <td className="px-4 py-2.5">
              <StatusBadge value={item.status} />
            </td>
            <td className="px-4 py-2.5 text-text-muted">{item.technician.fullName}</td>
            <td className="px-4 py-2.5">
              <div className="flex justify-end gap-1">
                <Button variant="ghost" size="icon" onClick={() => onView(item)} title="View detail" aria-label="View detail">
                  <Eye className="h-4 w-4" />
                </Button>
                {canEdit && (
                  <>
                    <Button variant="ghost" size="icon" onClick={() => onEdit(item)} title="Edit" aria-label="Edit">
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => onDelete(item)} title="Delete" aria-label="Delete">
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
