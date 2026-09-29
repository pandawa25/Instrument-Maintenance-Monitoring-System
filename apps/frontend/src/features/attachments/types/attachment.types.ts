export type AttachmentEntityType = 'CORRECTIVE_MAINTENANCE' | 'PM_PERIOD_EXECUTION';

export interface Attachment {
  id: string;
  entityType: AttachmentEntityType;
  entityId: string;
  fileName: string;
  mimeType: string;
  fileSize: number;
  uploadedBy: { id: string; fullName: string };
  createdAt: string;
  url: string;
}
