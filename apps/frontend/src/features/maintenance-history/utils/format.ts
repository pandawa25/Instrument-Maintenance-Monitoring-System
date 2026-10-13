const MONTHS_ID = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
const MONTHS_SHORT_ID = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];

// Tanggal dari API berbentuk 'yyyy-mm-dd' (tanggal kalender, tanpa zona waktu). Diurai manual —
// bukan lewat new Date(str) — supaya tidak bergeser sehari di zona waktu tertentu.
function parseYmd(value: string): { y: number; m: number; d: number } | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  if (!match) return null;
  return { y: Number(match[1]), m: Number(match[2]), d: Number(match[3]) };
}

/** '2026-09-05' -> '5 Sep 2026' */
export function formatDate(value: string | null | undefined): string {
  if (!value) return '—';
  const p = parseYmd(value);
  if (!p) return value;
  return `${p.d} ${MONTHS_SHORT_ID[p.m - 1]} ${p.y}`;
}

/** '2026-09-05' -> 'September 2026' (judul pemisah bulan di timeline) */
export function formatMonthYear(value: string): string {
  const p = parseYmd(value);
  if (!p) return value;
  return `${MONTHS_ID[p.m - 1]} ${p.y}`;
}

/** Kunci pengelompokan bulan: '2026-09' */
export function monthKey(value: string): string {
  return value.slice(0, 7);
}

const numberFormat = new Intl.NumberFormat('id-ID', { maximumFractionDigits: 2 });

export function formatNumber(value: number | null | undefined): string {
  if (value === null || value === undefined) return '—';
  return numberFormat.format(value);
}

export function formatHours(value: number | null | undefined): string {
  if (value === null || value === undefined) return '—';
  return `${numberFormat.format(value)} jam`;
}
