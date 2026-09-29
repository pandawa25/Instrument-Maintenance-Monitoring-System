import { useState } from 'react';
import { ChevronDown, ChevronRight, ClipboardEdit, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/shared/status-badge';
import { ConfirmDialog } from '@/components/shared/confirm-dialog';
import { usePmPeriodDetail, useDeletePmPeriod } from '../hooks/use-pm-periods';
import type { PmPeriodListItem } from '../types/pm-period.types';

interface Props {
  periods: PmPeriodListItem[];
  canEdit: boolean;
  onFillExecution: (executionId: string) => void;
}

export function PmPeriodList({ periods, canEdit, onFillExecution }: Props) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const deleteMutation = useDeletePmPeriod();

  if (periods.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-text-muted">
        Belum ada periode. Klik "Tambah Periode" untuk memulai.
      </div>
    );
  }

  async function confirmDelete() {
    if (!deletingId) return;
    await deleteMutation.mutateAsync(deletingId);
    setDeletingId(null);
  }

  return (
    <div className="space-y-2">
      {periods.map((period) => (
        <div key={period.id} className="rounded-xl border border-border/70 bg-surface shadow-sm">
          <button
            type="button"
            className="flex w-full items-center justify-between px-4 py-3 text-left"
            onClick={() => setExpandedId((cur) => (cur === period.id ? null : period.id))}
          >
            <div className="flex items-center gap-2">
              {expandedId === period.id ? (
                <ChevronDown className="h-4 w-4 text-text-muted" />
              ) : (
                <ChevronRight className="h-4 w-4 text-text-muted" />
              )}
              <span className="font-medium text-text">Periode {period.periodNumber}</span>
              <span className="text-sm text-text-muted">
                Rencana {new Date(period.plannedDate).toLocaleDateString('id-ID')}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm text-text-muted">
                {period.completedEquipment}/{period.totalEquipment} equipment selesai
              </span>
              <StatusBadge value={period.status} />
              {canEdit && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={(e) => {
                    e.stopPropagation();
                    setDeletingId(period.id);
                  }}
                  title="Hapus periode"
                >
                  <Trash2 className="h-4 w-4 text-danger" />
                </Button>
              )}
            </div>
          </button>

          {expandedId === period.id && (
            <PmPeriodExecutionsPanel periodId={period.id} canEdit={canEdit} onFillExecution={onFillExecution} />
          )}
        </div>
      ))}

      <ConfirmDialog
        open={Boolean(deletingId)}
        onOpenChange={(open) => !open && setDeletingId(null)}
        title="Hapus Periode"
        description="Periode ini akan dihapus. Aksi ini ditolak jika sudah ada eksekusi yang selesai, untuk menjaga histori."
        loading={deleteMutation.isPending}
        onConfirm={confirmDelete}
      />
    </div>
  );
}

function PmPeriodExecutionsPanel({
  periodId,
  canEdit,
  onFillExecution,
}: {
  periodId: string;
  canEdit: boolean;
  onFillExecution: (executionId: string) => void;
}) {
  const { data: detail, isLoading } = usePmPeriodDetail(periodId);

  if (isLoading || !detail) {
    return <p className="border-t border-border p-4 text-sm text-text-muted">Memuat eksekusi...</p>;
  }

  return (
    <div className="border-t border-border">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border bg-surface-2 text-left text-xs uppercase tracking-wide text-text-muted">
            <th className="px-4 py-2 font-medium">Tag Number</th>
            <th className="px-4 py-2 font-medium">Service</th>
            <th className="px-4 py-2 font-medium">Tgl Aktual</th>
            <th className="px-4 py-2 font-medium">Hasil</th>
            <th className="px-4 py-2 font-medium">Teknisi Vendor</th>
            <th className="px-4 py-2 font-medium">Status</th>
            {canEdit && <th className="px-4 py-2 font-medium text-right">Action</th>}
          </tr>
        </thead>
        <tbody>
          {detail.executions.map((exec) => (
            <tr key={exec.id} className="border-b border-border last:border-0 hover:bg-surface-2/60">
              <td className="px-4 py-2 font-mono text-xs text-text">{exec.equipment.tagNumber}</td>
              <td className="px-4 py-2 text-text-muted">{exec.equipment.service}</td>
              <td className="px-4 py-2 text-text-muted">
                {exec.executionDate ? new Date(exec.executionDate).toLocaleDateString('id-ID') : '—'}
              </td>
              <td className="px-4 py-2">{exec.result ? <StatusBadge value={exec.result} /> : '—'}</td>
              <td className="px-4 py-2 text-text-muted">{exec.vendorPersonnel || '—'}</td>
              <td className="px-4 py-2">
                <StatusBadge value={exec.status} />
              </td>
              {canEdit && (
                <td className="px-4 py-2 text-right">
                  <Button variant="ghost" size="icon" onClick={() => onFillExecution(exec.id)} title="Isi hasil">
                    <ClipboardEdit className="h-4 w-4" />
                  </Button>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
