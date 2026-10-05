// Zona waktu operasional aplikasi — tanggal transaksi stock dihitung menurut hari kerja user
// (WIB), bukan UTC server, supaya input tengah malam tidak jatuh ke tanggal yang salah.
const OPERATIONAL_TIME_ZONE = 'Asia/Jakarta';

/** Tanggal hari ini (yyyy-mm-dd) menurut zona waktu operasional. */
export function todayInOperationalZone(now: Date = new Date()): string {
  // Locale 'en-CA' memformat tanggal sebagai yyyy-mm-dd.
  return now.toLocaleDateString('en-CA', { timeZone: OPERATIONAL_TIME_ZONE });
}

/** Normalisasi input tanggal (yyyy-mm-dd atau ISO) menjadi `Date` UTC-midnight untuk kolom `@db.Date`. */
export function toDateOnly(value: string | Date): Date {
  const iso = typeof value === 'string' ? value.slice(0, 10) : value.toISOString().slice(0, 10);
  return new Date(`${iso}T00:00:00.000Z`);
}

/** Kolom `@db.Date` -> string yyyy-mm-dd untuk response API. */
export function formatDateOnly(value: Date): string {
  return value.toISOString().slice(0, 10);
}
