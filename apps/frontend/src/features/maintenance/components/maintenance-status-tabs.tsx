import { cn } from '@/lib/utils';
import type { MaintenanceStatus, MaintenanceStatusCounts } from '../types/maintenance.types';

const TABS: { value: MaintenanceStatus | ''; label: string }[] = [
  { value: '', label: 'Semua' },
  { value: 'OPEN', label: 'Open' },
  { value: 'IN_PROGRESS', label: 'In Progress' },
  { value: 'WAITING_MATERIAL', label: 'Waiting Material' },
  { value: 'COMPLETED', label: 'Completed' },
  { value: 'CANCELLED', label: 'Cancelled' },
];

interface Props {
  value: MaintenanceStatus | '';
  counts: MaintenanceStatusCounts | undefined;
  onChange: (value: MaintenanceStatus | '') => void;
}

export function MaintenanceStatusTabs({ value, counts, onChange }: Props) {
  return (
    <div className="flex flex-wrap gap-1 border-b border-border px-2">
      {TABS.map((tab) => {
        const count = counts?.[tab.value || 'ALL'] ?? 0;
        const active = value === tab.value;
        return (
          <button
            key={tab.value || 'ALL'}
            type="button"
            onClick={() => onChange(tab.value)}
            className={cn(
              'flex items-center gap-2 border-b-2 px-3 py-2.5 text-sm font-medium transition-colors',
              active
                ? 'border-primary text-primary'
                : 'border-transparent text-text-muted hover:text-text',
            )}
          >
            {tab.label}
            <span
              className={cn(
                'rounded-full px-1.5 py-0.5 text-xs font-semibold',
                active ? 'bg-primary text-white' : 'bg-surface-2 text-text-muted',
              )}
            >
              {count}
            </span>
          </button>
        );
      })}
    </div>
  );
}
