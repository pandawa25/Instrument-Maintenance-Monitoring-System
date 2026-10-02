import { useState } from 'react';
import { CalendarClock, ChevronDown, ChevronRight, ClipboardEdit, ClipboardList, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { StatusBadge } from '@/components/shared/status-badge';
import { ConfirmDialog } from '@/components/shared/confirm-dialog';
import { LoadingState } from '@/components/shared/loading-state';
import { EmptyState } from '@/components/shared/empty-state';
import { usePmPeriodDetail, useDeletePmPeriod } from '../hooks/use-pm-periods';
import { PmBulkExecutionFormDialog } from './pm-bulk-execution-form-dialog';
import type { PmPeriodListItem } from '../types/pm-period.types';
import { getErrorMessage } from '@/lib/axios';

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
      <div className="rounded-xl border border-dashed border-border">
        <EmptyState icon={CalendarClock} message='Belum ada periode. Klik "Tambah Periode" untuk memulai.' />
      </div>
    );
  }

  async function confirmDelete() {
    if (!deletingId) return;
    try {
      await deleteMutation.mutateAsync(deletingId);
      toast.success('Periode berhasil dihapus');
      setDeletingId(null);
    } catch (err: any) {
      toast.error(getErrorMessage(err, 'Gagal menghapus periode'));
    }
  }

  return (
    <div className="space-y-2">
      {periods.map((period) => (
        <Card key={period.id}>
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
        </Card>
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
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkDialogOpen, setBulkDialogOpen] = useState(false);

  if (isLoading || !detail) {
    return (
      <div className="border-t border-border">
        <LoadingState message="Memuat eksekusi..." />
      </div>
    );
  }

  const allSelected = detail.executions.length > 0 && selectedIds.size === detail.executions.length;
  const selectedExecutions = detail.executions.filter((exec) => selectedIds.has(exec.id));

  function toggleAll() {
    setSelectedIds(allSelected ? new Set() : new Set(detail!.executions.map((exec) => exec.id)));
  }

  function toggleOne(id: string) {
    setSelectedIds((cur) => {
      const next = new Set(cur);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <div className="border-t border-border">
      {canEdit && selectedIds.size > 0 && (
        <div className="flex items-center justify-between border-b border-border bg-primary-tint/40 px-4 py-2">
          <span className="text-sm text-text">{selectedIds.size} equipment dipilih</span>
          <Button size="sm" onClick={() => setBulkDialogOpen(true)}>
            <ClipboardList className="h-4 w-4" />
            Isi Massal
          </Button>
        </div>
      )}
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border bg-surface-2 text-left text-xs uppercase tracking-wide text-text-muted">
            {canEdit && (
              <th className="w-8 px-4 py-2">
                <input type="checkbox" className="h-4 w-4 rounded border-border" checked={allSelected} onChange={toggleAll} />
              </th>
            )}
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
              {canEdit && (
                <td className="px-4 py-2">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-border"
                    checked={selectedIds.has(exec.id)}
                    onChange={() => toggleOne(exec.id)}
                  />
                </td>
              )}
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

      {canEdit && (
        <PmBulkExecutionFormDialog
          open={bulkDialogOpen}
          onOpenChange={(open) => {
            setBulkDialogOpen(open);
            if (!open) setSelectedIds(new Set());
          }}
          executions={selectedExecutions}
        />
      )}
    </div>
  );
}
