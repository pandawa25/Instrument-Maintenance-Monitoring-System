import { useMemo, useRef, useState } from 'react';
import { CheckCircle2, ChevronLeft, ChevronRight, Download, TriangleAlert, UploadCloud, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { getErrorMessage } from '@/lib/axios';
import { cn } from '@/lib/utils';
import { downloadSparePartBulkTemplate } from '../api/spare-parts.api';
import { useCommitSparePartBulk, usePreviewSparePartBulk } from '../hooks/use-spare-parts';
import type { BulkRowAction, BulkRowSeverity, BulkUploadCommitResult, BulkUploadMode, BulkUploadPreview } from '../types/spare-part.types';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type Step = 'select' | 'preview' | 'done';

const ROWS_PER_PAGE = 20;

const SEVERITY_ICON: Record<BulkRowSeverity, React.ReactNode> = {
  OK: <CheckCircle2 className="h-3.5 w-3.5 text-success" />,
  WARNING: <TriangleAlert className="h-3.5 w-3.5 text-warning" />,
  ERROR: <XCircle className="h-3.5 w-3.5 text-danger" />,
};

const ACTION_BADGE: Record<BulkRowAction, { label: string; className: string }> = {
  CREATE: { label: 'Baru', className: 'bg-primary/10 text-primary' },
  UPDATE: { label: 'Update', className: 'bg-warning/10 text-warning' },
  NO_CHANGE: { label: 'Tanpa Perubahan', className: 'bg-surface-2 text-text-muted' },
};

const MODES: { value: BulkUploadMode; title: string; hint: string }[] = [
  { value: 'CREATE_ONLY', title: 'Hanya Tambah Baru', hint: 'KIMAP yang sudah ada akan ditolak (error).' },
  {
    value: 'UPDATE_OR_CREATE',
    title: 'Tambah & Update',
    hint: 'KIMAP yang sudah ada di-update (kolom kosong tidak mengubah data). Stok tidak berubah.',
  },
];

// Fitur ini hanya dirender untuk Admin (backend juga mengunci @Roles('Admin')).
export function SparePartBulkUploadDialog({ open, onOpenChange }: Props) {
  const [step, setStep] = useState<Step>('select');
  const [file, setFile] = useState<File | null>(null);
  const [mode, setMode] = useState<BulkUploadMode>('CREATE_ONLY');
  const [error, setError] = useState<string | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [preview, setPreview] = useState<BulkUploadPreview | null>(null);
  const [result, setResult] = useState<BulkUploadCommitResult | null>(null);
  const [severityFilter, setSeverityFilter] = useState<BulkRowSeverity | undefined>(undefined);
  const [page, setPage] = useState(1);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const previewMutation = usePreviewSparePartBulk();
  const commitMutation = useCommitSparePartBulk();

  const filteredRows = useMemo(
    () => (preview?.rows ?? []).filter((r) => !severityFilter || r.severity === severityFilter),
    [preview, severityFilter],
  );
  const totalPages = Math.max(1, Math.ceil(filteredRows.length / ROWS_PER_PAGE));
  const pageRows = filteredRows.slice((page - 1) * ROWS_PER_PAGE, page * ROWS_PER_PAGE);

  function reset() {
    setStep('select');
    setFile(null);
    setMode('CREATE_ONLY');
    setError(null);
    setPreview(null);
    setResult(null);
    setSeverityFilter(undefined);
    setPage(1);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  function handleClose(nextOpen: boolean) {
    if (!nextOpen) reset();
    onOpenChange(nextOpen);
  }

  async function handleDownloadTemplate() {
    setIsDownloading(true);
    try {
      await downloadSparePartBulkTemplate();
    } catch {
      toast.error('Gagal mengunduh template. Coba lagi.');
    } finally {
      setIsDownloading(false);
    }
  }

  async function handlePreview() {
    if (!file) {
      setError('Pilih file Excel (.xlsx) terlebih dahulu');
      return;
    }
    setError(null);
    try {
      const data = await previewMutation.mutateAsync({ file, mode });
      setPreview(data);
      setSeverityFilter(data.errorRows > 0 ? 'ERROR' : undefined);
      setPage(1);
      setStep('preview');
    } catch (err: any) {
      setError(getErrorMessage(err, 'Gagal memproses file — pastikan format sesuai template'));
    }
  }

  async function handleCommit() {
    if (!file) return;
    try {
      const data = await commitMutation.mutateAsync({ file, mode });
      setResult(data);
      toast.success(`${data.createdCount} spare part baru, ${data.updatedCount} di-update`);
      setStep('done');
    } catch (err: any) {
      toast.error(getErrorMessage(err, 'Gagal menyimpan — coba upload & preview ulang'));
    }
  }

  function filterBy(next: BulkRowSeverity | undefined) {
    setSeverityFilter(next);
    setPage(1);
  }

  const filterButton = (value: BulkRowSeverity | undefined, count: number, label: string, color: string) => (
    <button
      type="button"
      onClick={() => filterBy(value)}
      className={cn(
        'rounded-lg border p-2 transition-colors',
        severityFilter === value ? 'border-primary bg-primary/10' : 'border-border bg-surface-2/60',
      )}
    >
      <div className={cn('text-lg font-semibold', color)}>{count}</div>
      <div className="text-xs text-text-muted">{label}</div>
    </button>
  );

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Bulk Upload Spare Part</DialogTitle>
        </DialogHeader>

        {step === 'select' && (
          <div className="space-y-4">
            <div className="rounded-lg border border-dashed border-border bg-surface-2/60 p-4">
              <p className="text-sm text-text">
                1. Download template lalu isi data (KIMAP, Nama Material, dan Satuan wajib). Stok Awal hanya berlaku
                untuk spare part baru dan dicatat sebagai saldo awal di ledger.
              </p>
              <Button type="button" variant="outline" className="mt-3" onClick={handleDownloadTemplate} disabled={isDownloading}>
                <Download className="h-4 w-4" />
                {isDownloading ? 'Mengunduh...' : 'Download Template'}
              </Button>
            </div>

            <div>
              <p className="mb-2 text-sm text-text">2. Pilih mode upload:</p>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {MODES.map((m) => (
                  <button
                    key={m.value}
                    type="button"
                    onClick={() => setMode(m.value)}
                    aria-pressed={mode === m.value}
                    className={cn(
                      'rounded-lg border p-3 text-left text-sm transition-colors',
                      mode === m.value ? 'border-primary bg-primary/10' : 'border-border bg-surface-2/60',
                    )}
                  >
                    <p className="font-medium text-text">{m.title}</p>
                    <p className="mt-0.5 text-xs text-text-muted">{m.hint}</p>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="mb-2 text-sm text-text">
                3. Upload file Excel (maks 1000 baris, 5MB) untuk divalidasi dulu — belum langsung disimpan:
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx"
                aria-label="File Excel spare part"
                onChange={(e) => {
                  setFile(e.target.files?.[0] ?? null);
                  setError(null);
                }}
                className="block w-full text-sm text-text-muted file:mr-3 file:rounded-md file:border-0 file:bg-primary file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-white hover:file:bg-primary/90"
              />
            </div>

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
              {filterButton(undefined, preview.okRows + preview.warningRows + preview.errorRows, 'Semua', 'text-text')}
              {filterButton('WARNING', preview.warningRows, 'Warning', 'text-warning')}
              {filterButton('ERROR', preview.errorRows, 'Error', 'text-danger')}
            </div>

            {preview.errorRows > 0 ? (
              <p className="text-sm text-danger">
                Masih ada {preview.errorRows} baris error — perbaiki file lalu upload ulang. Simpan tidak bisa
                dilakukan sampai semua error selesai.
              </p>
            ) : !preview.canCommit ? (
              <p className="text-sm text-text-muted">Tidak ada perubahan yang perlu disimpan (semua baris sama dengan data saat ini).</p>
            ) : null}

            <div className="flex flex-wrap gap-3 text-xs text-text-muted">
              <span>
                <span className="font-medium text-primary">{preview.createRows}</span> baris baru
              </span>
              <span>
                <span className="font-medium text-warning">{preview.updateRows}</span> baris di-update
              </span>
              <span>
                <span className="font-medium">{preview.noChangeRows}</span> tanpa perubahan (dilewati)
              </span>
            </div>

            <div className="max-h-64 overflow-y-auto rounded-lg border border-border">
              {pageRows.length === 0 ? (
                <p className="p-4 text-sm text-text-muted">Tidak ada baris dengan filter ini.</p>
              ) : (
                <ul className="divide-y divide-border text-sm">
                  {pageRows.map((row) => (
                    <li key={row.rowNumber} className="flex items-start gap-2 p-2">
                      <span className="mt-0.5 shrink-0">{SEVERITY_ICON[row.severity]}</span>
                      <div className="min-w-0 flex-1">
                        <p className="flex flex-wrap items-center gap-1.5 font-medium text-text">
                          Baris {row.rowNumber}
                          {row.raw.kimap ? ` — ${row.raw.kimap}` : ''}
                          {row.raw.name ? <span className="font-normal text-text-muted">{row.raw.name}</span> : null}
                          {row.severity !== 'ERROR' && (
                            <span className={cn('rounded px-1.5 py-0.5 text-[10px] font-medium', ACTION_BADGE[row.action].className)}>
                              {ACTION_BADGE[row.action].label}
                            </span>
                          )}
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

            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-3 text-sm text-text-muted">
                <Button type="button" variant="outline" className="h-7 px-2" aria-label="Halaman sebelumnya" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                  <ChevronLeft className="h-3.5 w-3.5" />
                </Button>
                <span>
                  Halaman {page} / {totalPages}
                </span>
                <Button type="button" variant="outline" className="h-7 px-2" aria-label="Halaman berikutnya" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
                  <ChevronRight className="h-3.5 w-3.5" />
                </Button>
              </div>
            )}
          </div>
        )}

        {step === 'done' && result && (
          <div className="space-y-2 rounded-lg border border-success/30 bg-success/5 p-4 text-sm">
            <p className="flex items-center gap-2 font-medium text-text">
              <CheckCircle2 className="h-4 w-4 text-success" />
              Berhasil — {result.createdCount} spare part baru dibuat, {result.updatedCount} di-update
              {result.skippedCount > 0 && `, ${result.skippedCount} baris dilewati`}.
            </p>
            <p className="text-text-muted">File: {preview?.filename}</p>
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
                {commitMutation.isPending ? 'Menyimpan...' : `Simpan ${(preview?.createRows ?? 0) + (preview?.updateRows ?? 0)} Baris`}
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
