export interface DateRange {
  from: string; // yyyy-mm-dd, inklusif
  to: string; // yyyy-mm-dd, inklusif
}

// Locale 'en-CA' memformat Date sebagai yyyy-mm-dd — konvensi yang sama dipakai di
// features/spare-parts/utils/date.ts (todayDateInput()).
export function toInputDate(date: Date): string {
  return date.toLocaleDateString('en-CA');
}

export function parseInputDate(value: string): Date {
  return new Date(`${value.slice(0, 10)}T00:00:00`);
}

function addDays(date: Date, amount: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + amount);
  return next;
}

function startOfWeek(date: Date): Date {
  // Minggu mulai Senin (konvensi Indonesia) — getDay(): 0=Minggu..6=Sabtu.
  const day = date.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  return addDays(date, diff);
}

function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function endOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0);
}

export interface DateRangePreset {
  key: string;
  label: string;
  getRange: () => DateRange;
}

export function buildPresets(): DateRangePreset[] {
  const today = new Date();
  const todayStr = toInputDate(today);

  return [
    {
      key: 'max',
      label: 'Maksimum',
      // Tidak ada tabel "sejak sistem dibuat" — pakai rentang lebar (5 tahun) sebagai
      // pendekatan "semua data" tanpa membuat `from` opsional di API.
      getRange: () => ({ from: toInputDate(addDays(today, -5 * 365)), to: todayStr }),
    },
    {
      key: 'yesterday',
      label: 'Kemarin',
      getRange: () => {
        const yesterday = toInputDate(addDays(today, -1));
        return { from: yesterday, to: yesterday };
      },
    },
    {
      key: 'last7',
      label: '7 hari terakhir',
      getRange: () => ({ from: toInputDate(addDays(today, -6)), to: todayStr }),
    },
    {
      key: 'last14',
      label: '14 hari terakhir',
      getRange: () => ({ from: toInputDate(addDays(today, -13)), to: todayStr }),
    },
    {
      key: 'last30',
      label: '30 hari terakhir',
      getRange: () => ({ from: toInputDate(addDays(today, -29)), to: todayStr }),
    },
    {
      key: 'this-week',
      label: 'Minggu ini',
      getRange: () => ({ from: toInputDate(startOfWeek(today)), to: todayStr }),
    },
    {
      key: 'last-week',
      label: 'Minggu lalu',
      getRange: () => {
        const start = addDays(startOfWeek(today), -7);
        return { from: toInputDate(start), to: toInputDate(addDays(start, 6)) };
      },
    },
    {
      key: 'this-month',
      label: 'Bulan ini',
      getRange: () => ({ from: toInputDate(startOfMonth(today)), to: todayStr }),
    },
    {
      key: 'last-month',
      label: 'Bulan lalu',
      getRange: () => {
        const lastMonthEnd = addDays(startOfMonth(today), -1);
        return { from: toInputDate(startOfMonth(lastMonthEnd)), to: toInputDate(endOfMonth(lastMonthEnd)) };
      },
    },
  ];
}

export function defaultDateRange(): DateRange {
  const preset = buildPresets().find((p) => p.key === 'last7');
  return preset ? preset.getRange() : { from: toInputDate(new Date()), to: toInputDate(new Date()) };
}

export function formatRangeLabel(range: DateRange): string {
  const fmt = (value: string) => parseInputDate(value).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
  if (range.from === range.to) return fmt(range.from);
  return `${fmt(range.from)} - ${fmt(range.to)}`;
}

// Util kalender dual-bulan untuk custom range picker.
export interface CalendarDay {
  date: Date;
  inCurrentMonth: boolean;
}

export function buildMonthGrid(monthDate: Date): CalendarDay[] {
  const first = startOfMonth(monthDate);
  const gridStart = startOfWeek(first);
  const days: CalendarDay[] = [];
  for (let i = 0; i < 42; i += 1) {
    const date = addDays(gridStart, i);
    days.push({ date, inCurrentMonth: date.getMonth() === monthDate.getMonth() });
  }
  return days;
}

export function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

export function isWithinRange(date: Date, from: Date, to: Date): boolean {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
  const f = new Date(from.getFullYear(), from.getMonth(), from.getDate()).getTime();
  const t = new Date(to.getFullYear(), to.getMonth(), to.getDate()).getTime();
  return d >= Math.min(f, t) && d <= Math.max(f, t);
}
