import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { deleteAttachment, fetchAttachments, uploadAttachment } from '../api/attachments.api';
import type { AttachmentEntityType } from '../types/attachment.types';

const ATTACHMENTS_KEY = 'attachments';

export function useAttachments(entityType: AttachmentEntityType, entityId: string | undefined) {
  return useQuery({
    queryKey: [ATTACHMENTS_KEY, entityType, entityId],
    queryFn: () => fetchAttachments(entityType, entityId as string),
    enabled: Boolean(entityId),
  });
}

export function useUploadAttachment(entityType: AttachmentEntityType, entityId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (file: File) => uploadAttachment(entityType, entityId as string, file),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [ATTACHMENTS_KEY, entityType, entityId] }),
  });
}

export function useDeleteAttachment(entityType: AttachmentEntityType, entityId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteAttachment(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [ATTACHMENTS_KEY, entityType, entityId] }),
  });
}
