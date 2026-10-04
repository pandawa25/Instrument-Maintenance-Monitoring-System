import { useState } from 'react';
import { AlertTriangle, History, RotateCcw, Undo2 } from 'lucide-react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { LoadingState } from '@/components/shared/loading-state';
import { EmptyState } from '@/components/shared/empty-state';
import { useBulkOperations, usePreviewRevert, useCommitRevert } from '../hooks/use-equipment';
import type { BulkOperationListItem, RevertPreviewResult } from '../types/equipment.types';
import { getErrorMessage } from '@/lib/axios';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const SOURCE_LABEL: Record<BulkOperationListItem['source'], string> = {
  IMPORT_UPSERT: 'Bulk Upload (Update)',
  MANUAL_BULK_EDIT: 'Edit Massal',
};

/**
 * [Admin only] Riwayat operasi bulk (Bulk Upload mode Update & Edit Massal) + aksi rollback.
 * Backend yang jadi penjaga akses sesungguhnya (@Roles('Admin') di EquipmentController) —
 * tombol ini hanya dirender untuk role Admin di sisi UI supaya non-Admin tidak melihat UI
 * yang request-nya pasti ditolak 403.
 */
export function EquipmentRollbackDialog({ open, onOpenChange }: Props) {
  const [activeOperationId, setActiveOperationId] = useState<string | null>(null);
  const [preview, setPreview] = useState<RevertPreviewResult | null>(null);

  const operationsQuery = useBulkOperations();
  const previewMutation = usePreviewRevert();
  const commitMutation = useCommitRevert();

  function handleClose(nextOpen: boolean) {
    if (!nextOpen) {
      setActiveOperationId(null);
      setPreview(null);
    }
    onOpenChange(nextOpen);
  }

  async function handleStartRevert(operationId: string) {
    setActiveOperationId(operationId);
    setPreview(null);
    try {
      const result = await previewMutation.mutateAsync(operationId);
      setPreview(result);
    } catch (err: any) {
      toast.error(getErrorMessage(err, 'Gagal memuat preview rollback'));
      setActiveOperationId(null);
    }
  }

  async function handleConfirmRevert() {
    if (!activeOperationId) return;
    try {
      const result = await commitMutation.mutateAsync(activeOperationId);
      toast.success(
        `Rollback selesai — ${result.restoredCount} equipment dikembalikan${
          result.skippedCount > 0 ? `, ${result.skippedCount} dilewati karena konflik` : ''
        }`,
      );
      setActiveOperationId(null);
      setPreview(null);
    } catch (err: any) {
      toast.error(getErrorMessage(err, 'Gagal menjalankan rollback'));
    }
  }

  const operations = operationsQuery.data ?? [];

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <History className="h-4 w-4" />
            Riwayat Operasi Bulk &amp; Rollback
          </DialogTitle>
        </DialogHeader>

        {!activeOperationId && (
          <div className="max-h-[60vh] overflow-y-auto">
            {operationsQuery.isLoading ? (
              <LoadingState message="Memuat riwayat..." />
            ) : operations.length === 0 ? (
              <EmptyState icon={History} message="Belum ada operasi Bulk Upload (Update) atau Edit Massal." />
            ) : (
              <ul className="divide-y divide-border text-sm">
                {operations.map((op) => (
                  <li key={op.id} className="flex items-center justify-between gap-3 py-2.5">
                    <div className="min-w-0">
                      <p className="font-medium text-text">
                        {SOURCE_LABEL[op.source]}
                        {op.importBatch?.filename ? ` — ${op.importBatch.filename}` : ''}
                      </p>
                      <p className="text-xs text-text-muted">
                        {op.affectedCount} equipment terdampak · oleh {op.createdBy.fullName} ·{' '}
                        {new Date(op.createdAt).toLocaleString('id-ID')}
                      </p>
                      {op.status === 'REVERTED' && (
                        <p className="mt-0.5 text-xs text-text-muted">
                          Sudah di-rollback oleh {op.revertedBy?.fullName} pada{' '}
                          {op.revertedAt ? new Date(op.revertedAt).toLocaleString('id-ID') : '-'}
                        </p>
                      )}
                    </div>
                    {op.status === 'COMMITTED' ? (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleStartRevert(op.id)}
                        disabled={previewMutation.isPending}
                      >
                        <Undo2 className="h-3.5 w-3.5" />
                        Rollback
                      </Button>
                    ) : (
                      <span className="shrink-0 rounded-md bg-surface-2 px-2 py-1 text-xs text-text-muted">
                        Sudah di-rollback
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {activeOperationId && !preview && <LoadingState message="Memuat preview rollback..." />}

        {activeOperationId && preview && (
          <div className="space-y-3">
            <div className="flex items-start gap-2 rounded-lg border border-warning/30 bg-warning/5 p-3 text-sm text-text">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
              <p>
                Equipment yang direstore akan kembali ke nilai SEBELUM operasi ini dijalankan. Aksi ini tidak bisa
                di-undo lagi.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2 text-center text-sm">
              <div className="rounded-lg border border-border bg-surface-2/60 p-2">
                <div className="text-lg font-semibold text-success">{preview.restorableCount}</div>
                <div className="text-xs text-text-muted">Aman Direstore</div>
              </div>
              <div className="rounded-lg border border-border bg-surface-2/60 p-2">
                <div className="text-lg font-semibold text-danger">{preview.conflictedCount}</div>
                <div className="text-xs text-text-muted">Dilewati (Konflik)</div>
              </div>
            </div>

            {preview.conflicted.length > 0 && (
              <div className="max-h-40 overflow-y-auto rounded-lg border border-border">
                <ul className="divide-y divide-border text-xs">
                  {preview.conflicted.map((row) => (
                    <li key={row.equipmentId} className="p-2">
                      <p className="font-mono font-medium text-text">{row.tagNumber}</p>
                      <p className="text-text-muted">{row.reason}</p>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        <DialogFooter>
          {!activeOperationId && (
            <Button type="button" variant="outline" onClick={() => handleClose(false)}>
              Tutup
            </Button>
          )}
          {activeOperationId && preview && (
            <>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setActiveOperationId(null);
                  setPreview(null);
                }}
              >
                Batal
              </Button>
              <Button
                type="button"
                onClick={handleConfirmRevert}
                disabled={preview.restorableCount === 0 || commitMutation.isPending}
              >
                <RotateCcw className="h-4 w-4" />
                {commitMutation.isPending ? 'Memproses...' : `Rollback ${preview.restorableCount} Equipment`}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
