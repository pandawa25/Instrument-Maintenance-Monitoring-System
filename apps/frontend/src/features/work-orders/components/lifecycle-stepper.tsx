import { FilePlus, Lock, PlayCircle, Wrench } from 'lucide-react';
import { cn } from '@/lib/utils';
import { LIFECYCLE_STAGE_LABEL, LIFECYCLE_STAGE_ORDER, type StageCounts, type WorkOrderLifecycleStage } from '../types/work-order.types';

const STAGE_ICON: Record<WorkOrderLifecycleStage, typeof FilePlus> = {
  CREATED: FilePlus,
  RELEASED: PlayCircle,
  TECHNICALLY_COMPLETED: Wrench,
  CLOSED: Lock,
};

// Warna per tahap — dipinjam dari palet status yang sama dipakai StatusBadge (lihat
// status-badge.tsx: CREATED=muted, RELEASED=secondary, TECHNICALLY_COMPLETED=warning,
// CLOSED=success), supaya konsisten dengan badge yang muncul di tabel & detail.
const STAGE_STYLE: Record<WorkOrderLifecycleStage, { bar: string; chipActive: string; icon: string; iconBg: string }> = {
  CREATED: { bar: 'bg-text-muted/50', chipActive: 'border-text-muted bg-text-muted/10', icon: 'text-text-muted', iconBg: 'bg-text-muted/10' },
  RELEASED: { bar: 'bg-secondary', chipActive: 'border-secondary bg-secondary/10', icon: 'text-secondary', iconBg: 'bg-secondary/10' },
  TECHNICALLY_COMPLETED: { bar: 'bg-warning', chipActive: 'border-warning bg-warning/10', icon: 'text-warning', iconBg: 'bg-warning/10' },
  CLOSED: { bar: 'bg-success', chipActive: 'border-success bg-success/10', icon: 'text-success', iconBg: 'bg-success/10' },
};

interface Props {
  counts: StageCounts | undefined;
  active: WorkOrderLifecycleStage | undefined;
  onToggle: (stage: WorkOrderLifecycleStage) => void;
}

// Ringkasan 4 tahap siklus Work Order (diturunkan otomatis dari System Status ERP — lihat
// docs/design-notification-work-order.md §6). Ini BUKAN progress satu entitas berurutan
// (beda dari mis. tracker tagihan) — ini DISTRIBUSI jumlah di seluruh order, makanya
// divisualisasikan sebagai bar proporsional + chip, bukan garis "sudah dilewati".
// READ-ONLY: klik chip = filter list ke tahap itu (klik lagi = batalkan), BUKAN untuk
// mengubah data — supaya tahap selalu 100% cerminan data ERP.
export function LifecycleStepper({ counts, active, onToggle }: Props) {
  const total = LIFECYCLE_STAGE_ORDER.reduce((sum, stage) => sum + (counts?.[stage] ?? 0), 0);

  return (
    <div className="space-y-4">
      <div className="flex h-2 w-full overflow-hidden rounded-full bg-surface-2">
        {total === 0 ? (
          <div className="h-full w-full bg-surface-2" />
        ) : (
          LIFECYCLE_STAGE_ORDER.map((stage) => {
            const count = counts?.[stage] ?? 0;
            if (count === 0) return null;
            return (
              <div
                key={stage}
                className={cn('h-full transition-all', STAGE_STYLE[stage].bar, active && active !== stage && 'opacity-30')}
                style={{ width: `${(count / total) * 100}%` }}
                title={`${LIFECYCLE_STAGE_LABEL[stage]}: ${count}`}
              />
            );
          })
        )}
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {LIFECYCLE_STAGE_ORDER.map((stage) => {
          const Icon = STAGE_ICON[stage];
          const isActive = active === stage;
          const count = counts?.[stage] ?? 0;
          const pct = total > 0 ? Math.round((count / total) * 100) : 0;
          const style = STAGE_STYLE[stage];
          return (
            <button
              key={stage}
              type="button"
              onClick={() => onToggle(stage)}
              aria-pressed={isActive}
              className={cn(
                'flex items-center gap-3 rounded-lg border p-3 text-left transition-colors',
                isActive ? style.chipActive : 'border-border bg-surface hover:bg-surface-2/60',
              )}
            >
              <span className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-full', style.iconBg)}>
                <Icon className={cn('h-4 w-4', style.icon)} />
              </span>
              <span className="min-w-0">
                <span className="block text-xs font-medium text-text-muted">{LIFECYCLE_STAGE_LABEL[stage]}</span>
                <span className="flex items-baseline gap-1.5">
                  <span className="text-xl font-semibold text-text">{count}</span>
                  {total > 0 && <span className="text-[11px] text-text-muted">({pct}%)</span>}
                </span>
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
