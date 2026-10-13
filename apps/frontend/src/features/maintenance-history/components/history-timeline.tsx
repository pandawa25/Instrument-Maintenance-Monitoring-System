import { useMemo, useState } from 'react';
import { ChevronRight, History } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/shared/empty-state';
import { cn } from '@/lib/utils';
import { defaultOpenKeys, groupEventsByYearMonth } from '../utils/group-events';
import { HistoryEventRow } from './history-event-row';
import type { HistoryEvent } from '../types/maintenance-history.types';

function GroupToggle({
  open,
  onToggle,
  label,
  count,
  unfinished,
  level,
}: {
  open: boolean;
  onToggle: () => void;
  label: string;
  count: number;
  unfinished: number;
  level: 'year' | 'month';
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-expanded={open}
      className={cn(
        'flex w-full flex-wrap items-center gap-x-2 gap-y-1 rounded-lg px-2 py-1.5 text-left hover:bg-surface-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary',
        level === 'year' ? 'text-base font-semibold text-text' : 'text-sm font-semibold text-text',
      )}
    >
      <ChevronRight className={cn('h-4 w-4 shrink-0 text-text-muted transition-transform', open && 'rotate-90')} />
      <span>{label}</span>
      <span className="whitespace-nowrap rounded-full bg-surface-2 px-2 py-0.5 text-xs font-medium text-text-muted">{count} kegiatan</span>
      {unfinished > 0 && (
        <span className="whitespace-nowrap rounded-full bg-warning/10 px-2 py-0.5 text-xs font-medium text-warning">
          {unfinished} belum selesai
        </span>
      )}
    </button>
  );
}

// Tree ringkas: Tahun -> Bulan -> baris kegiatan. Hanya bulan terbaru (dan yang masih punya kegiatan
// belum selesai) terbuka secara default, jadi panjang halaman tidak ikut membesar seiring riwayat bertambah.
// Tahun disembunyikan sebagai level kalau datanya hanya satu tahun.
export function HistoryTimeline({ events, filtered }: { events: HistoryEvent[]; filtered: boolean }) {
  const years = useMemo(() => groupEventsByYearMonth(events), [events]);
  const defaults = useMemo(() => defaultOpenKeys(years), [years]);
  const [overrides, setOverrides] = useState<Record<string, boolean>>({});

  if (events.length === 0) {
    return (
      <Card>
        <EmptyState
          icon={History}
          message={
            filtered
              ? 'Tidak ada kegiatan maintenance pada filter ini.'
              : 'Belum ada riwayat maintenance untuk equipment ini.'
          }
        />
      </Card>
    );
  }

  const isOpen = (key: string) => overrides[key] ?? defaults.has(key);
  const toggle = (key: string) => setOverrides((prev) => ({ ...prev, [key]: !isOpen(key) }));
  const setAll = (value: boolean) => {
    const next: Record<string, boolean> = {};
    years.forEach((y) => {
      next[y.key] = value;
      y.months.forEach((m) => (next[m.key] = value));
    });
    setOverrides(next);
  };

  const showYears = years.length > 1;

  const renderMonth = (month: (typeof years)[number]['months'][number]) => (
    <li key={month.key}>
      <GroupToggle
        level="month"
        open={isOpen(month.key)}
        onToggle={() => toggle(month.key)}
        label={month.label}
        count={month.events.length}
        unfinished={month.unfinishedCount}
      />
      {isOpen(month.key) && (
        <ul className="ml-3 border-l border-border pl-1" aria-label={`Kegiatan ${month.label}`}>
          {month.events.map((event) => (
            <HistoryEventRow key={`${event.kind}-${event.id}`} event={event} />
          ))}
        </ul>
      )}
    </li>
  );

  return (
    <Card className="p-3">
      <div className="mb-2 flex items-center justify-between gap-2 px-1">
        <p className="text-xs text-text-muted">
          {events.length} kegiatan<span className="hidden sm:inline"> · klik judul untuk halaman detail, panah untuk ringkasan</span>
        </p>
        <div className="flex gap-1">
          <Button type="button" variant="ghost" size="sm" onClick={() => setAll(true)}>
            Buka semua
          </Button>
          <Button type="button" variant="ghost" size="sm" onClick={() => setAll(false)}>
            Tutup semua
          </Button>
        </div>
      </div>

      <ul className="space-y-0.5" aria-label="Tree history maintenance">
        {showYears
          ? years.map((year) => (
              <li key={year.key}>
                <GroupToggle
                  level="year"
                  open={isOpen(year.key)}
                  onToggle={() => toggle(year.key)}
                  label={year.key}
                  count={year.eventCount}
                  unfinished={year.unfinishedCount}
                />
                {isOpen(year.key) && (
                  <ul className="ml-3 space-y-0.5 border-l border-border pl-2">{year.months.map(renderMonth)}</ul>
                )}
              </li>
            ))
          : years[0].months.map(renderMonth)}
      </ul>
    </Card>
  );
}
