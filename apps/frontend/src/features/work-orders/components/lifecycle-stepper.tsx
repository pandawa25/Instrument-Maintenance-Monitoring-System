import { FilePlus, Lock, PlayCircle, Wrench } from 'lucide-react';
import { cn } from '@/lib/utils';
import { LIFECYCLE_STAGE_LABEL, LIFECYCLE_STAGE_ORDER, type StageCounts, type WorkOrderLifecycleStage } from '../types/work-order.types';

const STAGE_ICON: Record<WorkOrderLifecycleStage, typeof FilePlus> = {
  CREATED: FilePlus,
  RELEASED: PlayCircle,
  TECHNICALLY_COMPLETED: Wrench,
  CLOSED: Lock,
};

interface Props {
  counts: StageCounts | undefined;
  active: WorkOrderLifecycleStage | undefined;
  onToggle: (stage: WorkOrderLifecycleStage) => void;
}

// Stepper 4 tahap siklus Work Order (diturunkan otomatis dari System Status ERP — lihat
// docs/design-notification-work-order.md §6). READ-ONLY: klik node = filter list ke tahap
// itu (klik lagi = batalkan), BUKAN untuk mengubah data — supaya tahap selalu 100% cerminan
// data ERP, tidak ada sumber kebenaran kedua yang bisa berbeda.
export function LifecycleStepper({ counts, active, onToggle }: Props) {
  const activeIndex = active ? LIFECYCLE_STAGE_ORDER.indexOf(active) : -1;

  return (
    <div className="relative flex items-start justify-between px-2 py-2">
      <div className="absolute left-10 right-10 top-[27px] h-0.5 bg-border" />
      {activeIndex >= 0 && (
        <div
          className="absolute left-10 top-[27px] h-0.5 bg-primary transition-all"
          style={{ width: `${(activeIndex / (LIFECYCLE_STAGE_ORDER.length - 1)) * 100}%`, maxWidth: 'calc(100% - 5rem)' }}
        />
      )}
      {LIFECYCLE_STAGE_ORDER.map((stage) => {
        const Icon = STAGE_ICON[stage];
        const isActive = active === stage;
        const count = counts?.[stage] ?? 0;
        return (
          <button
            key={stage}
            type="button"
            onClick={() => onToggle(stage)}
            className="relative z-10 flex w-1/4 flex-col items-center gap-1.5 text-center"
            aria-pressed={isActive}
          >
            <span
              className={cn(
                'flex h-8 w-8 items-center justify-center rounded-full border transition-colors',
                isActive ? 'border-primary bg-primary text-white' : 'border-border bg-surface text-text-muted hover:border-primary/50',
              )}
            >
              <Icon className="h-4 w-4" />
            </span>
            <span className={cn('text-xs font-medium', isActive ? 'text-primary' : 'text-text')}>
              {LIFECYCLE_STAGE_LABEL[stage]}
            </span>
            <span className="text-[11px] text-text-muted">{count}</span>
          </button>
        );
      })}
    </div>
  );
}
