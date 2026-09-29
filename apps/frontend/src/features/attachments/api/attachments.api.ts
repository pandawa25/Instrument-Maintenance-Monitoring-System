import { api } from '@/lib/axios';
import type { Attachment, AttachmentEntityType } from '../types/attachment.types';

export async function fetchAttachments(entityType: AttachmentEntityType, entityId: string) {
  const { data } = await api.get<{ data: Attachment[] }>('/attachments', { params: { entityType, entityId } });
  return data.data;
}

export async function uploadAttachment(entityType: AttachmentEntityType, entityId: string, file: File) {
  const formData = new FormData();
  formData.append('entityType', entityType);
  formData.append('entityId', entityId);
  formData.append('file', file);

  const { data } = await api.post<{ data: Attachment }>('/attachments/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data.data;
}

export async function deleteAttachment(id: string) {
  await api.delete(`/attachments/${id}`);
}

// Endpoint file dilindungi JwtAuthGuard — tidak bisa dipakai langsung sebagai
// <img src>/<a href> (browser tidak sisipkan Authorization header). Ambil sebagai
// blob lewat axios (yang sudah otomatis sisipkan token), lalu buat object URL.
export async function fetchAttachmentBlob(id: string): Promise<Blob> {
  const { data } = await api.get(`/attachments/${id}/file`, { responseType: 'blob' });
  return data;
}
