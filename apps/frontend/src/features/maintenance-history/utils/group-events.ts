import { formatMonthYear, monthKey } from './format';
import type { HistoryEvent } from '../types/maintenance-history.types';

export interface HistoryMonthGroup {
  key: string; // '2026-10'
  label: string; // 'Oktober 2026'
  events: HistoryEvent[];
  unfinishedCount: number;
}

export interface HistoryYearGroup {
  key: string; // '2026'
  months: HistoryMonthGroup[];
  eventCount: number;
  unfinishedCount: number;
}

/** Corrective yang belum COMPLETED = masih perlu perhatian. PM di history selalu sudah selesai. */
export function isUnfinished(event: HistoryEvent): boolean {
  return event.kind === 'CORRECTIVE' && event.status !== 'COMPLETED';
}

/**
 * Kelompokkan event (sudah terurut terbaru -> terlama) menjadi Tahun -> Bulan.
 * Urutan input dipertahankan, jadi grup terbaru selalu di depan.
 */
export function groupEventsByYearMonth(events: HistoryEvent[]): HistoryYearGroup[] {
  const years: HistoryYearGroup[] = [];
  for (const event of events) {
    const mKey = monthKey(event.date);
    const yKey = mKey.slice(0, 4);
    let year = years.find((y) => y.key === yKey);
    if (!year) {
      year = { key: yKey, months: [], eventCount: 0, unfinishedCount: 0 };
      years.push(year);
    }
    let month = year.months.find((m) => m.key === mKey);
    if (!month) {
      month = { key: mKey, label: formatMonthYear(event.date), events: [], unfinishedCount: 0 };
      year.months.push(month);
    }
    month.events.push(event);
    year.eventCount += 1;
    if (isUnfinished(event)) {
      month.unfinishedCount += 1;
      year.unfinishedCount += 1;
    }
  }
  return years;
}

/** Default buka: grup terbaru + grup yang masih punya kegiatan belum selesai. */
export function defaultOpenKeys(years: HistoryYearGroup[]): Set<string> {
  const open = new Set<string>();
  years.forEach((year, yi) => {
    if (yi === 0 || year.unfinishedCount > 0) open.add(year.key);
    year.months.forEach((month, mi) => {
      if ((yi === 0 && mi === 0) || month.unfinishedCount > 0) open.add(month.key);
    });
  });
  return open;
}
