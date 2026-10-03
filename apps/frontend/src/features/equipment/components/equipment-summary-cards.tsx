import type { LucideIcon } from 'lucide-react';
import { CircleX, Layers, PauseCircle, CheckCircle2 } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type { EquipmentStatusCounts } from '../types/equipment.types';

interface CardDef {
  label: string;
  value: number;
  icon: LucideIcon;
  accent: string; // warna ikon + lingkaran background ikon
  hint?: string;
  hintClass?: string;
}

interface Props {
  counts: EquipmentStatusCounts | undefined;
  isLoading: boolean;
}

function pctOfTotal(value: number, total: number) {
  if (total === 0) return 0;
  return Math.round((value / total) * 100);
}

export function EquipmentSummaryCards({ counts, isLoading }: Props) {
  const total = counts?.ALL ?? 0;
  const active = counts?.ACTIVE ?? 0;
  const standby = counts?.STANDBY ?? 0;
  const outOfService = counts?.OUT_OF_SERVICE ?? 0;

  const cards: CardDef[] = [
    {
      label: 'Total Equipment',
      value: total,
      icon: Layers,
      accent: 'bg-primary/10 text-primary',
    },
    {
      label: 'Active',
      value: active,
      icon: CheckCircle2,
      accent: 'bg-success/10 text-success',
      hint: `${pctOfTotal(active, total)}% dari total`,
      hintClass: 'text-success',
    },
    {
      label: 'Standby',
      value: standby,
      icon: PauseCircle,
      accent: 'bg-warning/10 text-warning',
      hint: `${pctOfTotal(standby, total)}% dari total`,
      hintClass: 'text-warning',
    },
    {
      label: 'Out Of Service',
      value: outOfService,
      icon: CircleX,
      accent: 'bg-danger/10 text-danger',
      hint: `${pctOfTotal(outOfService, total)}% dari total`,
      hintClass: 'text-danger',
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      {cards.map((card) => (
        <Card key={card.label} className="flex items-center gap-3 p-4">
          <div className={cn('flex h-11 w-11 shrink-0 items-center justify-center rounded-full', card.accent)}>
            <card.icon className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <div className="text-2xl font-semibold text-text">
              {isLoading ? <span className="inline-block h-7 w-10 animate-pulse rounded bg-surface-2" /> : card.value}
            </div>
            <p className="truncate text-xs text-text-muted">{card.label}</p>
            {card.hint && <p className={cn('text-[11px] font-medium', card.hintClass)}>{card.hint}</p>}
          </div>
        </Card>
      ))}
    </div>
  );
}
