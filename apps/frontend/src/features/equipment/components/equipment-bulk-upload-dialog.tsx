import { useRef, useState } from 'react';
import { Download, UploadCloud } from 'lucide-react';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useBulkUploadEquipment } from '../hooks/use-equipment';
import { downloadBulkUploadTemplate } from '../api/equipment.api';
import type { BulkUploadResult } from '../types/equipment.types';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EquipmentBulkUploadDialog({ open, onOpenChange }: Props) {
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<BulkUploadResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const uploadMutation = useBulkUploadEquipment();

  function reset() {
    setFile(null);
    setResult(null);
    setError(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  function handleClose(nextOpen: boolean) {
    if (!nextOpen) reset();
    onOpenChange(nextOpen);
  }

  async function handleDownloadTemplate() {
    setIsDownloading(true);
    try {
      await downloadBulkUploadTemplate();
    } catch {
      setError('Gagal mengunduh template. Coba lagi.');
    } finally {
      setIsDownloading(false);
    }
  }

  async function handleUpload() {
    if (!file) {
      setError('Pilih file Excel (.xlsx) terlebih dahulu');
      return;
    }
    setError(null);
    setResult(null);
    try {
      const res = await uploadMutation.mutateAsync(file);
      setResult(res);
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'Gagal memproses file — pastikan format sesuai template');
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Bulk Upload Equipment</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="rounded-lg border border-dashed border-border bg-surface-2/60 p-4">
            <p className="text-sm text-text">
              1. Download template, isi data sesuai kolom (Area Code &amp; Instrument Name Code harus sudah
              terdaftar di master data).
            </p>
            <Button
              type="button"
              variant="outline"
              className="mt-3"
              onClick={handleDownloadTemplate}
              disabled={isDownloading}
            >
              <Download className="h-4 w-4" />
              {isDownloading ? 'Mengunduh...' : 'Download Template'}
            </Button>
          </div>

          <div>
            <p className="mb-2 text-sm text-text">2. Upload file Excel yang sudah diisi:</p>
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx"
              onChange={(e) => {
                setFile(e.target.files?.[0] ?? null);
                setResult(null);
                setError(null);
              }}
              className="block w-full text-sm text-text-muted file:mr-3 file:rounded-md file:border-0 file:bg-primary file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-white hover:file:bg-primary/90"
            />
          </div>

          {error && <p className="text-sm text-danger">{error}</p>}

          {result && (
            <div className="space-y-2 rounded-lg border border-border bg-surface-2/60 p-4 text-sm">
              <p className="font-medium text-text">
                Total {result.totalRows} baris — {result.created} baru dibuat, {result.updated} diupdate,{' '}
                {result.failed} gagal.
              </p>
              {result.errors.length > 0 && (
                <div className="max-h-40 overflow-y-auto rounded border border-danger/30 bg-danger/5 p-2">
                  <ul className="space-y-1 text-xs text-danger">
                    {result.errors.map((e, idx) => (
                      <li key={idx}>
                        Baris {e.row}: {e.message}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => handleClose(false)}>
            Tutup
          </Button>
          <Button type="button" onClick={handleUpload} disabled={!file || uploadMutation.isPending}>
            <UploadCloud className="h-4 w-4" />
            {uploadMutation.isPending ? 'Memproses...' : 'Upload'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
