import { useRef, useState } from 'react';
import { Download, FileText, ImageIcon, Loader2, Trash2, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getErrorMessage } from '@/lib/axios';
import { fetchAttachmentBlob } from '../api/attachments.api';
import { useAttachments, useDeleteAttachment, useUploadAttachment } from '../hooks/use-attachments';
import { AttachmentTile } from './attachments-section';
import type { Attachment, AttachmentEntityType } from '../types/attachment.types';

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;
const ACCEPTED_TYPES = 'image/jpeg,image/png,image/webp,application/pdf';
const ACCEPTED_MIME = ACCEPTED_TYPES.split(',');

function formatSize(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

interface Props {
  entityType: AttachmentEntityType;
  entityId: string | undefined;
  /** Boleh upload & hapus (di server tetap dicek ulang). */
  canEdit: boolean;
}

/**
 * Dokumen sebuah record, dipisah jadi "Foto" (gambar, tampil sebagai thumbnail) dan
 * "Dokumen / Datasheet" (PDF, tampil sebagai daftar). Dipakai halaman detail Equipment.
 * Bisa memilih beberapa file sekaligus; file diunggah satu per satu dan kegagalan satu file
 * tidak membatalkan file lain.
 */
export function DocumentsSection({ entityType, entityId, canEdit }: Props) {
  const { data: attachments, isLoading } = useAttachments(entityType, entityId);
  const uploadMutation = useUploadAttachment(entityType, entityId);
  const deleteMutation = useDeleteAttachment(entityType, entityId);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);

  if (!entityId) return null;

  const photos = (attachments ?? []).filter((a) => a.mimeType.startsWith('image/'));
  const documents = (attachments ?? []).filter((a) => !a.mimeType.startsWith('image/'));

  async function handleFilesChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    e.target.value = '';
    if (files.length === 0) return;

    const problems: string[] = [];
    setUploading(true);
    for (const file of files) {
      if (!ACCEPTED_MIME.includes(file.type)) {
        problems.push(`${file.name}: tipe file tidak didukung (hanya JPG, PNG, WEBP, atau PDF)`);
        continue;
      }
      if (file.size > MAX_FILE_SIZE_BYTES) {
        problems.push(`${file.name}: ukuran melebihi 10MB`);
        continue;
      }
      try {
        await uploadMutation.mutateAsync(file);
      } catch (err: any) {
        problems.push(`${file.name}: ${getErrorMessage(err, 'gagal diunggah')}`);
      }
    }
    setUploading(false);
    setErrors(problems);
  }

  async function open(attachment: Attachment, download = false) {
    try {
      const blob = await fetchAttachmentBlob(attachment.id);
      const objectUrl = URL.createObjectURL(blob);
      if (download) {
        const link = document.createElement('a');
        link.href = objectUrl;
        link.download = attachment.fileName;
        document.body.appendChild(link);
        link.click();
        link.remove();
      } else {
        window.open(objectUrl, '_blank');
      }
      setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000);
    } catch {
      setErrors(['Gagal membuka file']);
    }
  }

  async function remove(attachment: Attachment) {
    try {
      await deleteMutation.mutateAsync(attachment.id);
    } catch (err: any) {
      setErrors([`${attachment.fileName}: ${getErrorMessage(err, 'gagal dihapus')}`]);
    }
  }

  return (
    <section aria-label="Dokumen equipment" className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h4 className="text-xs font-semibold uppercase tracking-wide text-text-muted">Foto &amp; Dokumen</h4>
          <p className="text-xs text-text-muted">Foto lapangan dan datasheet/manual (JPG, PNG, WEBP, PDF — maks 10MB per file).</p>
        </div>
        {canEdit && (
          <>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept={ACCEPTED_TYPES}
              aria-label="Pilih file foto atau dokumen"
              className="hidden"
              onChange={handleFilesChange}
            />
            <Button type="button" variant="outline" size="sm" disabled={uploading} onClick={() => fileInputRef.current?.click()}>
              {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
              {uploading ? 'Mengunggah...' : 'Upload Foto / Dokumen'}
            </Button>
          </>
        )}
      </div>

      {errors.length > 0 && (
        <ul role="alert" className="space-y-0.5 text-xs text-danger">
          {errors.map((m) => (
            <li key={m}>{m}</li>
          ))}
        </ul>
      )}

      {isLoading ? (
        <p className="text-xs text-text-muted">Memuat dokumen...</p>
      ) : !attachments?.length ? (
        <p className="text-xs text-text-muted">Belum ada foto atau dokumen.</p>
      ) : (
        <>
          <div>
            <p className="mb-2 flex items-center gap-1.5 text-sm font-medium text-text">
              <ImageIcon className="h-4 w-4 text-text-muted" aria-hidden /> Foto ({photos.length})
            </p>
            {photos.length === 0 ? (
              <p className="text-xs text-text-muted">Belum ada foto.</p>
            ) : (
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-6">
                {photos.map((a) => (
                  <AttachmentTile key={a.id} attachment={a} canEdit={canEdit} onOpen={() => open(a)} onDelete={() => remove(a)} />
                ))}
              </div>
            )}
          </div>

          <div>
            <p className="mb-2 flex items-center gap-1.5 text-sm font-medium text-text">
              <FileText className="h-4 w-4 text-text-muted" aria-hidden /> Dokumen / Datasheet ({documents.length})
            </p>
            {documents.length === 0 ? (
              <p className="text-xs text-text-muted">Belum ada dokumen.</p>
            ) : (
              <ul className="divide-y divide-border rounded-lg border border-border">
                {documents.map((a) => (
                  <li key={a.id} className="flex items-center gap-2 px-3 py-2">
                    <FileText className="h-5 w-5 shrink-0 text-danger" aria-hidden />
                    <button
                      type="button"
                      onClick={() => open(a)}
                      className="min-w-0 flex-1 truncate text-left text-sm font-medium text-primary hover:underline"
                      title={a.fileName}
                    >
                      {a.fileName}
                    </button>
                    <span className="hidden shrink-0 text-xs text-text-muted sm:inline">
                      {formatSize(a.fileSize)} · {a.uploadedBy.fullName} · {new Date(a.createdAt).toLocaleDateString('id-ID')}
                    </span>
                    <Button type="button" variant="ghost" size="icon" aria-label={`Unduh ${a.fileName}`} title="Unduh" onClick={() => open(a, true)}>
                      <Download className="h-4 w-4" />
                    </Button>
                    {canEdit && (
                      <Button type="button" variant="ghost" size="icon" aria-label={`Hapus ${a.fileName}`} title="Hapus" onClick={() => remove(a)}>
                        <Trash2 className="h-4 w-4 text-danger" />
                      </Button>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      )}
    </section>
  );
}
