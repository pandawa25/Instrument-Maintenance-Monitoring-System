import { ListChecks } from 'lucide-react';
import { DetailDialog, type DetailField } from '@/components/shared/detail-dialog';
import type { PmActivityType } from '../types/pm-activity-type.types';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  activityType: PmActivityType | null;
}

export function PmActivityTypeDetailDialog({ open, onOpenChange, activityType }: Props) {
  if (!activityType) return null;

  const fields: DetailField[] = [
    { label: 'Code', value: activityType.code },
    { label: 'Name', value: activityType.name },
    { label: 'Description', value: activityType.description, fullWidth: true },
    { label: 'Dipakai di Checklist', value: activityType.totalChecklistItem },
    { label: 'Dibuat Pada', value: new Date(activityType.createdAt).toLocaleString('id-ID') },
    { label: 'Terakhir Diubah', value: new Date(activityType.updatedAt).toLocaleString('id-ID') },
  ];

  return (
    <DetailDialog
      open={open}
      onOpenChange={onOpenChange}
      icon={ListChecks}
      title="Detail PM Activity Type"
      subtitle={activityType.code}
      fields={fields}
    />
  );
}
