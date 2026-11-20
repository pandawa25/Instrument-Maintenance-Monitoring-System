import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { TrendMetric } from '../types/dashboard.types';

export interface ClickableCardDef {
  metric: TrendMetric;
  label: string;
  icon: LucideIcon;
  accent: string; // warna ikon & border aktif
  hint?: string;
}

interface Props {
  cards: ClickableCardDef[];
  values: Partial<Record<TrendMetric, number>>;
  isLoading: boolean;
  activeMetric: TrendMetric;
  onSelect: (metric: TrendMetric) => void;
}

// card.accent selalu berupa class "text-*" (dipakai sebagai warna ikon/border
// aktif) — chip ikon butuh versi "bg-*/10" dari warna yang sama, jadi diturunkan
// di sini (bukan field terpisah) supaya tidak bisa nyasar tidak sinkron.
function accentChipBg(accent: string): string {
  return `${accent.replace('text-', 'bg-')}/10`;
}

// Kotak data (summary) yang bisa diklik — klik kotak mengganti metric yang
// digambar di TrendChart di bawahnya (lihat referensi desain dashboard).
export function ClickableSummaryCards({ cards, values, isLoading, activeMetric, onSelect }: Props) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
      {cards.map((card) => {
        const active = card.metric === activeMetric;
        const value = values[card.metric];
        return (
          <button
            key={card.metric}
            type="button"
            onClick={() => onSelect(card.metric)}
            className={cn(
              'rounded-xl border bg-surface p-4 text-left shadow-card transition-all hover:shadow-card-hover',
              active ? 'border-primary ring-1 ring-primary/30' : 'border-border',
            )}
          >
            <div className="flex items-start justify-between gap-2">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-text-muted">{card.label}</span>
              <div className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded-lg', accentChipBg(card.accent))}>
                <card.icon className={cn('h-4 w-4 shrink-0', card.accent)} />
              </div>
            </div>
            <div className="mt-2 font-display text-2xl font-extrabold tracking-tight text-text">
              {isLoading || value === undefined ? (
                <span className="inline-block h-7 w-12 animate-pulse rounded bg-surface-2" />
              ) : (
                value
              )}
            </div>
            {card.hint && <p className="mt-1 text-[11px] text-text-muted">{card.hint}</p>}
          </button>
        );
      })}
    </div>
  );
}
