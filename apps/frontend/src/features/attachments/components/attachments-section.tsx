import { useEffect, useRef, useState } from 'react';
import { FileText, Loader2, Trash2, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { fetchAttachmentBlob } from '../api/attachments.api';
import { useAttachments, useDeleteAttachment, useUploadAttachment } from '../hooks/use-attachments';
import type { Attachment, AttachmentEntityType } from '../types/attachment.types';

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;
const ACCEPTED_TYPES = 'image/jpeg,image/png,image/webp,application/pdf';

interface Props {
  entityType: AttachmentEntityType;
  entityId: string | undefined;
  canEdit: boolean;
}

// Section reusable untuk lampiran evidence (foto/PDF) — dipakai di Corrective
// Maintenance (detail dialog) & PM Period Execution (form dialog). Hanya bisa
// dipakai untuk record yang SUDAH ada id-nya (tidak bisa upload saat create,
// karena attachment butuh entityId).
export function AttachmentsSection({ entityType, entityId, canEdit }: Props) {
  const { data: attachments, isLoading } = useAttachments(entityType, entityId);
  const uploadMutation = useUploadAttachment(entityType, entityId);
  const deleteMutation = useDeleteAttachment(entityType, entityId);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);

  if (!entityId) return null;

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    setError(null);
    if (file.size > MAX_FILE_SIZE_BYTES) {
      setError('Ukuran file maksimal 10MB');
      return;
    }

    try {
      await uploadMutation.mutateAsync(file);
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'Gagal upload lampiran');
    }
  }

  async function handleOpen(attachment: Attachment) {
    try {
      const blob = await fetchAttachmentBlob(attachment.id);
      const objectUrl = URL.createObjectURL(blob);
      window.open(objectUrl, '_blank');
      setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000);
    } catch {
      setError('Gagal membuka file lampiran');
    }
  }

  async function handleDelete(id: string) {
    try {
      await deleteMutation.mutateAsync(id);
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'Gagal menghapus lampiran');
    }
  }

  return (
    <div className="space-y-2 rounded-lg border border-border p-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-text">Lampiran Evidence (Foto/PDF)</p>
        {canEdit && (
          <>
            <input
              ref={fileInputRef}
              type="file"
              accept={ACCEPTED_TYPES}
              className="hidden"
              onChange={handleFileChange}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={uploadMutation.isPending}
              onClick={() => fileInputRef.current?.click()}
            >
              {uploadMutation.isPending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Upload className="h-3.5 w-3.5" />
              )}
              Upload
            </Button>
          </>
        )}
      </div>

      {error && <p className="text-xs text-danger">{error}</p>}

      {isLoading ? (
        <p className="text-xs text-text-muted">Memuat lampiran...</p>
      ) : !attachments?.length ? (
        <p className="text-xs text-text-muted">Belum ada lampiran.</p>
      ) : (
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5">
          {attachments.map((attachment) => (
            <AttachmentTile
              key={attachment.id}
              attachment={attachment}
              canEdit={canEdit}
              onOpen={() => handleOpen(attachment)}
              onDelete={() => handleDelete(attachment.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function AttachmentTile({
  attachment,
  canEdit,
  onOpen,
  onDelete,
}: {
  attachment: Attachment;
  canEdit: boolean;
  onOpen: () => void;
  onDelete: () => void;
}) {
  const [thumbUrl, setThumbUrl] = useState<string | null>(null);
  const isImage = attachment.mimeType.startsWith('image/');

  useEffect(() => {
    let objectUrl: string | null = null;
    let cancelled = false;

    if (isImage) {
      fetchAttachmentBlob(attachment.id).then((blob) => {
        if (cancelled) return;
        objectUrl = URL.createObjectURL(blob);
        setThumbUrl(objectUrl);
      }).catch(() => undefined);
    }

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [attachment.id, isImage]);

  return (
    <div className="group relative overflow-hidden rounded-lg border border-border bg-surface-2">
      <button type="button" onClick={onOpen} className="block h-20 w-full" title={attachment.fileName}>
        {isImage && thumbUrl ? (
          <img src={thumbUrl} alt={attachment.fileName} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <FileText className="h-7 w-7 text-text-muted" />
          </div>
        )}
      </button>
      <p className="truncate px-1.5 py-1 text-[10px] text-text-muted" title={attachment.fileName}>
        {attachment.fileName}
      </p>
      {canEdit && (
        <button
          type="button"
          onClick={onDelete}
          className="absolute right-1 top-1 rounded-full bg-danger/90 p-1 text-white opacity-0 transition-opacity group-hover:opacity-100"
          title="Hapus lampiran"
        >
          <Trash2 className="h-3 w-3" />
        </button>
      )}
    </div>
  );
}
