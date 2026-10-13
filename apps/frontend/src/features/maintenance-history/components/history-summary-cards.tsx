import type { LucideIcon } from 'lucide-react';
import { CalendarCheck, CalendarClock, Hourglass, ListChecks, Wrench } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { formatDate, formatNumber } from '../utils/format';
import type { HistorySummary } from '../types/maintenance-history.types';

interface CardDef {
  label: string;
  value: string;
  icon: LucideIcon;
  accent: string;
  /** Nilai panjang (mis. tanggal) pakai font lebih kecil supaya tidak terpotong di kartu sempit. */
  compact?: boolean;
  hint?: string;
  hintClass?: string;
}

export function HistorySummaryCards({ summary }: { summary: HistorySummary }) {
  const cards: CardDef[] = [
    { label: 'Total Kegiatan', value: formatNumber(summary.totalEvents), icon: ListChecks, accent: 'bg-primary-tint text-primary' },
    {
      label: 'Corrective',
      value: formatNumber(summary.correctiveCount),
      icon: Wrench,
      accent: 'bg-warning/10 text-warning',
      hint: summary.openCorrectiveCount > 0 ? `${summary.openCorrectiveCount} belum selesai` : 'Semua selesai',
      hintClass: summary.openCorrectiveCount > 0 ? 'text-danger' : 'text-success',
    },
    { label: 'Preventive', value: formatNumber(summary.preventiveCount), icon: CalendarCheck, accent: 'bg-secondary/10 text-secondary' },
    {
      label: 'Total Downtime',
      value: `${formatNumber(summary.totalDowntimeHours)} jam`,
      icon: Hourglass,
      accent: 'bg-danger/10 text-danger',
      hint: 'Dari Corrective',
      hintClass: 'text-text-muted',
    },
    {
      label: 'Kegiatan Terakhir',
      value: summary.lastActivityDate ? formatDate(summary.lastActivityDate) : '—',
      icon: CalendarClock,
      accent: 'bg-success/10 text-success',
      compact: true,
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
      {cards.map((c) => (
        <Card key={c.label} className="p-4">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="text-xs font-medium text-text-muted">{c.label}</div>
              <div className={`mt-1 font-semibold text-text ${c.compact ? 'text-base leading-7' : 'truncate text-xl'}`}>{c.value}</div>
              {c.hint && <div className={`mt-0.5 text-xs ${c.hintClass ?? 'text-text-muted'}`}>{c.hint}</div>}
            </div>
            <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${c.accent}`}>
              <c.icon className="h-4 w-4" />
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}
