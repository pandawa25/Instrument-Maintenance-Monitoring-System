import { useRef, useState } from 'react';
import { CheckCircle2, ChevronLeft, ChevronRight, TriangleAlert, UploadCloud, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useCommitWorkOrderImport, usePreviewWorkOrderImport, useWorkOrderImportRows } from '../hooks/use-work-orders';
import type { ImportRowSeverity, WoImportPreviewResult } from '../types/work-order.types';
import { getErrorMessage } from '@/lib/axios';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type Step = 'select' | 'preview' | 'done';

const ROWS_PER_PAGE = 20;

const SEVERITY_ICON: Record<ImportRowSeverity, React.ReactNode> = {
  OK: <CheckCircle2 className="h-3.5 w-3.5 text-success" />,
  WARNING: <TriangleAlert className="h-3.5 w-3.5 text-warning" />,
  ERROR: <XCircle className="h-3.5 w-3.5 text-danger" />,
};

// Import export SAP PM (36 kolom, deteksi header otomatis) — lihat
// docs/design-notification-work-order.md §7. Admin only (dicek di backend). Berbeda dari
// Bulk Upload Equipment: tidak ada pilihan mode, selalu upsert by Order No/Notification No.
export function WorkOrderImportDialog({ open, onOpenChange }: Props) {
  const [step, setStep] = useState<Step>('select');
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<WoImportPreviewResult | null>(null);
  const [severityFilter, setSeverityFilter] = useState<ImportRowSeverity | undefined>(undefined);
  const [rowsPage, setRowsPage] = useState(1);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const previewMutation = usePreviewWorkOrderImport();
  const commitMutation = useCommitWorkOrderImport();
  const rowsQuery = useWorkOrderImportRows(preview?.batchId ?? null, {
    severity: severityFilter,
    page: rowsPage,
    limit: ROWS_PER_PAGE,
  });

  function reset() {
    setStep('select');
    setFile(null);
    setError(null);
    setPreview(null);
    setSeverityFilter(undefined);
    setRowsPage(1);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  function handleClose(nextOpen: boolean) {
    if (!nextOpen) reset();
    onOpenChange(nextOpen);
  }

  async function handlePreview() {
    if (!file) {
      setError('Pilih file Excel (.xlsx) export ERP terlebih dahulu');
      return;
    }
    setError(null);
    try {
      const result = await previewMutation.mutateAsync(file);
      setPreview(result);
      setSeverityFilter(result.errorRows > 0 ? 'ERROR' : undefined);
      setRowsPage(1);
      setStep('preview');
    } catch (err: any) {
      setError(getErrorMessage(err, 'Gagal memproses file — pastikan file adalah export SAP PM asli'));
    }
  }

  async function handleCommit() {
    if (!preview) return;
    try {
      const result = await commitMutation.mutateAsync(preview.batchId);
      toast.success(
        `${result?.workOrderCount ?? 0} Work Order diimpor${(result?.unmatchedCount ?? 0) > 0 ? ` (${result?.unmatchedCount} belum terhubung ke equipment)` : ''}`,
      );
      setStep('done');
    } catch (err: any) {
      toast.error(getErrorMessage(err, 'Gagal commit — coba upload & preview ulang'));
    }
  }

  function handleFilterChange(next: ImportRowSeverity | undefined) {
    setSeverityFilter(next);
    setRowsPage(1);
  }

  const rows = rowsQuery.data?.data ?? [];
  const rowsMeta = rowsQuery.data?.meta;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Import Work Order &amp; Notification (ERP)</DialogTitle>
        </DialogHeader>

        {step === 'select' && (
          <div className="space-y-4">
            <div className="rounded-lg border border-dashed border-border bg-surface-2/60 p-4 text-sm text-text">
              Upload file export SAP PM asli (maks 1000 baris, 5MB) — kolom dideteksi otomatis dari header baris
              pertama. Data akan divalidasi dulu, belum langsung disimpan. Equipment yang kodenya tidak ketemu di
              Master Equipment tetap diimpor, masuk ke &quot;Antrian Belum Terhubung&quot; untuk di-link manual.
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx"
              onChange={(e) => {
                setFile(e.target.files?.[0] ?? null);
                setError(null);
              }}
              className="block w-full text-sm text-text-muted file:mr-3 file:rounded-md file:border-0 file:bg-primary file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-white hover:file:bg-primary/90"
            />
            {error && <p className="text-sm text-danger">{error}</p>}
          </div>
        )}

        {step === 'preview' && preview && (
          <div className="space-y-4">
            <div className="grid grid-cols-4 gap-2 text-center text-sm">
              <div className="rounded-lg border border-border bg-surface-2/60 p-2">
                <div className="text-lg font-semibold text-text">{preview.totalRows}</div>
                <div className="text-xs text-text-muted">Total baris</div>
              </div>
              <button
                type="button"
                onClick={() => handleFilterChange(undefined)}
                className={`rounded-lg border p-2 transition-colors ${severityFilter === undefined ? 'border-primary bg-primary/10' : 'border-border bg-surface-2/60'}`}
              >
                <div className="text-lg font-semibold text-success">{preview.okRows}</div>
                <div className="text-xs text-text-muted">OK</div>
              </button>
              <button
                type="button"
                onClick={() => handleFilterChange('WARNING')}
                className={`rounded-lg border p-2 transition-colors ${severityFilter === 'WARNING' ? 'border-primary bg-primary/10' : 'border-border bg-surface-2/60'}`}
              >
                <div className="text-lg font-semibold text-warning">{preview.warningRows}</div>
                <div className="text-xs text-text-muted">Warning</div>
              </button>
              <button
                type="button"
                onClick={() => handleFilterChange('ERROR')}
                className={`rounded-lg border p-2 transition-colors ${severityFilter === 'ERROR' ? 'border-primary bg-primary/10' : 'border-border bg-surface-2/60'}`}
              >
                <div className="text-lg font-semibold text-danger">{preview.errorRows}</div>
                <div className="text-xs text-text-muted">Error</div>
              </button>
            </div>

            {preview.errorRows > 0 && (
              <p className="text-sm text-danger">
                Masih ada {preview.errorRows} baris error — perbaiki file lalu upload ulang. Commit tidak bisa
                dilakukan sampai semua error selesai.
              </p>
            )}

            <div className="max-h-64 overflow-y-auto rounded-lg border border-border">
              {rowsQuery.isLoading ? (
                <p className="p-4 text-sm text-text-muted">Memuat baris...</p>
              ) : rows.length === 0 ? (
                <p className="p-4 text-sm text-text-muted">Tidak ada baris dengan filter ini.</p>
              ) : (
                <ul className="divide-y divide-border text-sm">
                  {rows.map((row) => (
                    <li key={row.rowNumber} className="flex items-start gap-2 p-2">
                      <span className="mt-0.5 shrink-0">{SEVERITY_ICON[row.severity]}</span>
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-text">
                          Baris {row.rowNumber}
                          {typeof row.raw.orderNo === 'string' && row.raw.orderNo ? ` — ${row.raw.orderNo}` : ''}
                        </p>
                        {row.messages.length > 0 && (
                          <ul className="mt-0.5 space-y-0.5 text-xs text-text-muted">
                            {row.messages.map((m, idx) => (
                              <li key={idx}>{m}</li>
                            ))}
                          </ul>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {rowsMeta && rowsMeta.totalPages > 1 && (
              <div className="flex items-center justify-center gap-3 text-sm text-text-muted">
                <Button
                  type="button"
                  variant="outline"
                  className="h-7 px-2"
                  disabled={rowsPage <= 1}
                  onClick={() => setRowsPage((p) => Math.max(1, p - 1))}
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                </Button>
                <span>
                  Halaman {rowsMeta.page} / {rowsMeta.totalPages}
                </span>
                <Button
                  type="button"
                  variant="outline"
                  className="h-7 px-2"
                  disabled={rowsPage >= rowsMeta.totalPages}
                  onClick={() => setRowsPage((p) => p + 1)}
                >
                  <ChevronRight className="h-3.5 w-3.5" />
                </Button>
              </div>
            )}
          </div>
        )}

        {step === 'done' && preview && (
          <div className="space-y-2 rounded-lg border border-success/30 bg-success/5 p-4 text-sm">
            <p className="flex items-center gap-2 font-medium text-text">
              <CheckCircle2 className="h-4 w-4 text-success" />
              Berhasil — {commitMutation.data?.workOrderCount ?? 0} Work Order diimpor.
            </p>
            {(commitMutation.data?.unmatchedCount ?? 0) > 0 && (
              <p className="text-warning">
                {commitMutation.data?.unmatchedCount} baris belum terhubung ke equipment — cek tab &quot;Antrian
                Belum Terhubung&quot;.
              </p>
            )}
            <p className="text-text-muted">File: {preview.filename}</p>
          </div>
        )}

        <DialogFooter>
          {step === 'select' && (
            <>
              <Button type="button" variant="outline" onClick={() => handleClose(false)}>
                Tutup
              </Button>
              <Button type="button" onClick={handlePreview} disabled={!file || previewMutation.isPending}>
                <UploadCloud className="h-4 w-4" />
                {previewMutation.isPending ? 'Memvalidasi...' : 'Upload & Preview'}
              </Button>
            </>
          )}

          {step === 'preview' && (
            <>
              <Button type="button" variant="outline" onClick={reset}>
                Upload File Lain
              </Button>
              <Button type="button" onClick={handleCommit} disabled={!preview?.canCommit || commitMutation.isPending}>
                {commitMutation.isPending
                  ? 'Menyimpan...'
                  : `Commit ${(preview?.okRows ?? 0) + (preview?.warningRows ?? 0)} Baris`}
              </Button>
            </>
          )}

          {step === 'done' && (
            <Button type="button" onClick={() => handleClose(false)}>
              Selesai
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
