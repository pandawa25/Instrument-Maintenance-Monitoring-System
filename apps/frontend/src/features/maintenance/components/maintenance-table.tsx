import { Pencil, Trash2, Eye, PackageSearch, Wrench } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/shared/status-badge';
import { LoadingState } from '@/components/shared/loading-state';
import { EmptyState } from '@/components/shared/empty-state';
import { SortableTh } from '@/components/shared/sortable-th';
import type { Maintenance, MaintenanceSortableField } from '../types/maintenance.types';
import { dataRowProps } from '@/components/shared/data-row';

interface Props {
  items: Maintenance[];
  isLoading: boolean;
  canEdit: boolean;
  sortBy?: MaintenanceSortableField;
  sortOrder?: 'asc' | 'desc';
  onSort: (field: MaintenanceSortableField) => void;
  onEdit: (item: Maintenance) => void;
  onDelete: (item: Maintenance) => void;
  onView: (item: Maintenance) => void;
}

const MS_PER_DAY = 1000 * 60 * 60 * 24;

function diffInDays(from: string, to: Date): number {
  // Hitung selisih hari kalender (bukan jam penuh 24) supaya "hari yang sama" = 0 hari.
  const start = new Date(from);
  start.setHours(0, 0, 0, 0);
  to.setHours(0, 0, 0, 0);
  return Math.max(0, Math.round((to.getTime() - start.getTime()) / MS_PER_DAY));
}

/** Durasi penanganan: selesai → hari tetap (maintenanceDate → completionDate); belum → hari berjalan sampai hari ini. */
function renderDurasi(item: Maintenance) {
  if (item.status === 'CANCELLED') return <span>-</span>;

  if (item.completionDate) {
    const days = diffInDays(item.maintenanceDate, new Date(item.completionDate));
    return <span>{days} hari</span>;
  }

  const daysRunning = diffInDays(item.maintenanceDate, new Date());
  const isLong = daysRunning >= 7;
  return (
    <span className={isLong ? 'font-medium text-danger' : ''}>
      {daysRunning} hari {isLong ? '(berjalan!)' : '(berjalan)'}
    </span>
  );
}

export function MaintenanceTable({ items, isLoading, canEdit, sortBy, sortOrder, onSort, onEdit, onDelete, onView }: Props) {
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
          <SortableTh label="No. e-SPK" field="spkNumber" sortBy={sortBy} sortOrder={sortOrder} onSort={onSort} />
          <SortableTh label="Tanggal" field="maintenanceDate" sortBy={sortBy} sortOrder={sortOrder} onSort={onSort} />
          <th className="px-4 py-2.5 font-medium">Tag Number</th>
          <th className="px-4 py-2.5 font-medium">Description</th>
          <SortableTh label="Priority" field="priority" sortBy={sortBy} sortOrder={sortOrder} onSort={onSort} />
          <SortableTh label="Status" field="status" sortBy={sortBy} sortOrder={sortOrder} onSort={onSort} />
          <SortableTh label="Tgl Selesai" field="completionDate" sortBy={sortBy} sortOrder={sortOrder} onSort={onSort} />
          <th className="px-4 py-2.5 font-medium">Durasi</th>
          <th className="px-4 py-2.5 font-medium">PIC</th>
          <th className="px-4 py-2.5 font-medium text-right">Aksi</th>
        </tr>
      </thead>
      <tbody>
        {items.map((item) => (
          <tr key={item.id} {...dataRowProps(() => onView(item))}>
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
            <td className="px-4 py-2.5 text-text-muted">
              {item.completionDate ? new Date(item.completionDate).toLocaleDateString('id-ID') : '-'}
            </td>
            <td className="px-4 py-2.5 text-text-muted">{renderDurasi(item)}</td>
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
