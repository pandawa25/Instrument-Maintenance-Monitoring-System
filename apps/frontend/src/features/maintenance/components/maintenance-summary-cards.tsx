import type { LucideIcon } from 'lucide-react';
import { ClipboardList, CheckCircle2, Clock, Wrench } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type { MaintenanceKpiSummary } from '../types/maintenance.types';

interface CardDef {
  label: string;
  value: number;
  icon: LucideIcon;
  accent: string; // warna ikon + lingkaran background ikon
  hint: string;
  hintClass: string;
}

interface Props {
  summary: MaintenanceKpiSummary | undefined;
  isLoading: boolean;
}

function trendHint(pct: number) {
  if (pct === 0) return { text: 'Sama dengan bulan lalu', cls: 'text-text-muted' };
  const sign = pct > 0 ? '+' : '';
  return {
    text: `${sign}${pct}% dari bulan lalu`,
    cls: pct > 0 ? 'text-success' : 'text-danger',
  };
}

export function MaintenanceSummaryCards({ summary, isLoading }: Props) {
  const completedTrend = trendHint(summary?.completedTrendPct ?? 0);
  const totalTrend = trendHint(summary?.totalTrendPct ?? 0);

  const cards: CardDef[] = [
    {
      label: 'Open Work Order',
      value: summary?.openCount ?? 0,
      icon: ClipboardList,
      accent: 'bg-danger/10 text-danger',
      hint: `${summary?.overdueCount ?? 0} Overdue`,
      hintClass: 'text-danger',
    },
    {
      label: 'Completed (This Month)',
      value: summary?.completedThisMonth ?? 0,
      icon: CheckCircle2,
      accent: 'bg-success/10 text-success',
      hint: completedTrend.text,
      hintClass: completedTrend.cls,
    },
    {
      label: 'Waiting Material',
      value: summary?.waitingMaterialCount ?? 0,
      icon: Clock,
      accent: 'bg-warning/10 text-warning',
      hint: `${summary?.waitingMaterialStuckCount ?? 0} > 7 hari`,
      hintClass: 'text-warning',
    },
    {
      label: 'Total (This Month)',
      value: summary?.totalThisMonth ?? 0,
      icon: Wrench,
      accent: 'bg-secondary/10 text-secondary',
      hint: totalTrend.text,
      hintClass: totalTrend.cls,
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
            <p className={cn('text-[11px] font-medium', card.hintClass)}>{card.hint}</p>
          </div>
        </Card>
      ))}
    </div>
  );
}
