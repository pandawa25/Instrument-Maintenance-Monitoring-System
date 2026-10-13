import { describe, expect, it } from 'vitest';
import { defaultOpenKeys, groupEventsByYearMonth } from './group-events';
import type { HistoryEvent } from '../types/maintenance-history.types';

function ev(id: string, date: string, kind: HistoryEvent['kind'] = 'CORRECTIVE', status = 'COMPLETED'): HistoryEvent {
  return { id, kind, date, status, title: id, remarks: null, materials: [], corrective: null, preventive: null, createdAt: date };
}

describe('groupEventsByYearMonth', () => {
  const events = [
    ev('a', '2026-10-12', 'CORRECTIVE', 'WAITING_MATERIAL'),
    ev('b', '2026-10-08'),
    ev('c', '2026-03-01', 'PREVENTIVE'),
    ev('d', '2025-12-30', 'CORRECTIVE', 'OPEN'),
    ev('e', '2025-01-02'),
  ];

  it('mengelompokkan Tahun -> Bulan dengan urutan terbaru dulu', () => {
    const g = groupEventsByYearMonth(events);
    expect(g.map((y) => y.key)).toEqual(['2026', '2025']);
    expect(g[0].months.map((m) => [m.key, m.events.length])).toEqual([['2026-10', 2], ['2026-03', 1]]);
    expect(g[1].months.map((m) => m.key)).toEqual(['2025-12', '2025-01']);
    expect(g[0].months[0].label).toBe('Oktober 2026');
  });

  it('menghitung kegiatan belum selesai (hanya corrective non-COMPLETED)', () => {
    const g = groupEventsByYearMonth(events);
    expect(g[0].unfinishedCount).toBe(1);
    expect(g[0].months[1].unfinishedCount).toBe(0);
    expect(g[1].unfinishedCount).toBe(1);
  });

  it('kosong -> kosong', () => {
    expect(groupEventsByYearMonth([])).toEqual([]);
  });

  it('default buka: bulan terbaru + grup yang punya item belum selesai', () => {
    const open = defaultOpenKeys(groupEventsByYearMonth(events));
    expect([...open].sort()).toEqual(['2025', '2025-12', '2026', '2026-10']);
  });
});
