import { Pencil, Trash2, Eye, Gauge } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/shared/status-badge';
import { LoadingState } from '@/components/shared/loading-state';
import { EmptyState } from '@/components/shared/empty-state';
import { cn } from '@/lib/utils';
import { isValveInstrumentCode, type Equipment, type EquipmentStatus } from '../types/equipment.types';

// Aksen warna kiri per baris — scan cepat status tanpa harus baca kolom Status
// (konsisten dengan warna StatusBadge: success/warning/danger).
const STATUS_ROW_ACCENT: Record<EquipmentStatus, string> = {
  ACTIVE: 'border-l-success',
  STANDBY: 'border-l-warning',
  OUT_OF_SERVICE: 'border-l-danger',
};

/** Range (LRV-URV/Unit) untuk equipment ukur, atau Size/Rating untuk equipment valve. */
function rangeOrSizeCell(item: Equipment): string {
  if (isValveInstrumentCode(item.instrumentName.code)) {
    if (!item.size && !item.rating) return '—';
    return [item.size, item.rating].filter(Boolean).join(' · ');
  }
  if (item.lrv !== null && item.urv !== null && item.lrv !== undefined && item.urv !== undefined) {
    return `${item.lrv} – ${item.urv}${item.unit ? ` ${item.unit}` : ''}`;
  }
  return '—';
}

interface Props {
  equipment: Equipment[];
  isLoading: boolean;
  canEdit: boolean;
  onEdit: (equipment: Equipment) => void;
  onDelete: (equipment: Equipment) => void;
  onView: (equipment: Equipment) => void;
}

export function EquipmentTable({ equipment, isLoading, canEdit, onEdit, onDelete, onView }: Props) {
  if (isLoading) {
    return <LoadingState />;
  }

  if (equipment.length === 0) {
    return <EmptyState icon={Gauge} message="Belum ada data equipment." />;
  }

  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="border-b border-border bg-surface-2 text-left text-xs uppercase tracking-wide text-text-muted">
          <th className="px-4 py-2.5 font-medium">Tag Number</th>
          <th className="px-4 py-2.5 font-medium">Instrument Name</th>
          <th className="px-4 py-2.5 font-medium">Service</th>
          <th className="px-4 py-2.5 font-medium">Type</th>
          <th className="px-4 py-2.5 font-medium">Range / Size</th>
          <th className="px-4 py-2.5 font-medium">Status</th>
          <th className="px-4 py-2.5 font-medium">Last Maintenance</th>
          <th className="px-4 py-2.5 font-medium text-right">Action</th>
        </tr>
      </thead>
      <tbody>
        {equipment.map((item) => (
          <tr key={item.id} className="border-b border-border last:border-0 hover:bg-surface-2/60">
            <td
              className={cn(
                'border-l-4 px-4 py-2.5 font-mono text-xs text-text',
                STATUS_ROW_ACCENT[item.status] ?? 'border-l-transparent',
              )}
            >
              {item.tagNumber}
            </td>
            <td className="px-4 py-2.5 text-text-muted">{item.instrumentName.name}</td>
            <td className="px-4 py-2.5 text-text">{item.service}</td>
            <td className="px-4 py-2.5 text-text-muted">{item.type || '—'}</td>
            <td className="px-4 py-2.5 text-text-muted">{rangeOrSizeCell(item)}</td>
            <td className="px-4 py-2.5">
              <StatusBadge value={item.status} dot />
            </td>
            <td className="px-4 py-2.5 text-text-muted">
              {item.lastMaintenanceDate ? new Date(item.lastMaintenanceDate).toLocaleDateString('id-ID') : '—'}
            </td>
            <td className="px-4 py-2.5">
              <div className="flex justify-end gap-1">
                <Button variant="ghost" size="icon" onClick={() => onView(item)} title="View detail">
                  <Eye className="h-4 w-4" />
                </Button>
                {canEdit && (
                  <>
                    <Button variant="ghost" size="icon" onClick={() => onEdit(item)} title="Edit">
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => onDelete(item)} title="Delete">
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
