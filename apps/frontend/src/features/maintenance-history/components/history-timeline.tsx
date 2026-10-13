import { Fragment } from 'react';
import { History } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/shared/empty-state';
import { formatMonthYear, monthKey } from '../utils/format';
import { HistoryEventCard } from './history-event-card';
import type { HistoryEvent } from '../types/maintenance-history.types';

// Timeline vertikal, terbaru di atas, dipisah per bulan supaya riwayat panjang tetap mudah dipindai.
export function HistoryTimeline({ events, filtered }: { events: HistoryEvent[]; filtered: boolean }) {
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

  let lastMonth = '';
  return (
    <ol className="relative space-y-4 before:absolute before:bottom-2 before:left-[17px] before:top-2 before:w-px before:bg-border" aria-label="Timeline history maintenance">
      {events.map((event) => {
        const key = monthKey(event.date);
        const showMonth = key !== lastMonth;
        lastMonth = key;
        return (
          <Fragment key={`${event.kind}-${event.id}`}>
            {showMonth && (
              <li className="relative pl-12 pt-2" aria-hidden>
                <span className="inline-block rounded-md bg-surface-2 px-2 py-0.5 text-xs font-semibold uppercase tracking-wide text-text-muted">
                  {formatMonthYear(event.date)}
                </span>
              </li>
            )}
            <HistoryEventCard event={event} />
          </Fragment>
        );
      })}
    </ol>
  );
}
