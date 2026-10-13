import { describe, expect, it } from 'vitest';
import { formatDate, formatHours, formatMonthYear, formatNumber, monthKey } from './format';

describe('format utils (History Maintenance)', () => {
  it('formatDate: yyyy-mm-dd -> d Mon yyyy tanpa pergeseran zona waktu', () => {
    expect(formatDate('2026-09-05')).toBe('5 Sep 2026');
    expect(formatDate('2026-01-31')).toBe('31 Jan 2026');
    expect(formatDate('2026-12-01T00:00:00.000Z')).toBe('1 Des 2026');
  });

  it('formatDate: kosong -> em dash; tidak valid -> apa adanya', () => {
    expect(formatDate(null)).toBe('—');
    expect(formatDate(undefined)).toBe('—');
    expect(formatDate('bukan-tanggal')).toBe('bukan-tanggal');
  });

  it('formatMonthYear & monthKey', () => {
    expect(formatMonthYear('2026-09-05')).toBe('September 2026');
    expect(monthKey('2026-09-05')).toBe('2026-09');
  });

  it('formatNumber / formatHours: locale id-ID, maksimal 2 desimal', () => {
    expect(formatNumber(1234.5)).toBe('1.234,5');
    expect(formatNumber(2)).toBe('2');
    expect(formatNumber(null)).toBe('—');
    expect(formatHours(2.5)).toBe('2,5 jam');
    expect(formatHours(null)).toBe('—');
  });
});
