import { cn } from '@/lib/utils';

const STATUS_STYLES: Record<string, string> = {
  ACTIVE: 'bg-success/10 text-success border-success/30',
  INACTIVE: 'bg-text-muted/10 text-text-muted border-text-muted/30',
  STANDBY: 'bg-warning/10 text-warning border-warning/30',
  OUT_OF_SERVICE: 'bg-danger/10 text-danger border-danger/30',
  HIGH: 'bg-danger/10 text-danger border-danger/30',
  MEDIUM: 'bg-warning/10 text-warning border-warning/30',
  LOW: 'bg-success/10 text-success border-success/30',
  OPEN: 'bg-danger/10 text-danger border-danger/30',
  IN_PROGRESS: 'bg-warning/10 text-warning border-warning/30',
  COMPLETED: 'bg-success/10 text-success border-success/30',
  SCHEDULED: 'bg-secondary/10 text-secondary border-secondary/30',
  OVERDUE: 'bg-danger/10 text-danger border-danger/30',
  PENDING: 'bg-text-muted/10 text-text-muted border-text-muted/30',
  OK: 'bg-success/10 text-success border-success/30',
  NOT_OK: 'bg-danger/10 text-danger border-danger/30',
  NA: 'bg-text-muted/10 text-text-muted border-text-muted/30',
};

export function StatusBadge({ value }: { value: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium',
        STATUS_STYLES[value] ?? 'bg-surface-2 text-text-muted border-border',
      )}
    >
      {value.replace(/_/g, ' ')}
    </span>
  );
}
