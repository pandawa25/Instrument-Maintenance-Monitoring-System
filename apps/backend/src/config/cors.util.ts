// Parse CORS_ORIGIN menjadi daftar origin yang sudah dinormalisasi.
//
// Origin browser selalu berbentuk `scheme://host[:port]` TANPA path/trailing slash,
// dan cors() membandingkannya string-per-string. Env var yang diisi
// "https://tigalimabelas.com/" (trailing slash) atau memakai huruf besar akan
// diam-diam tidak pernah cocok -> semua request lintas-origin (termasuk login)
// ditolak browser. Karena itu nilai dinormalisasi di sini.
//
// Mendukung beberapa origin dipisah koma, mis. untuk apex + www sekaligus:
//   CORS_ORIGIN=https://tigalimabelas.com,https://www.tigalimabelas.com
export function parseCorsOrigins(raw: string | undefined, fallback = 'http://localhost:5173'): string[] {
  const source = raw && raw.trim().length > 0 ? raw : fallback;

  const origins = source
    .split(',')
    .map((item) => item.trim())
    .filter((item) => item.length > 0)
    .map(normalizeOrigin);

  return Array.from(new Set(origins));
}

function normalizeOrigin(value: string): string {
  try {
    // new URL().origin membuang path/trailing slash dan melowercase scheme+host.
    const { origin } = new URL(value);
    if (origin && origin !== 'null') return origin;
  } catch {
    // Bukan URL valid (mis. "tigalimabelas.com" tanpa scheme) — jatuh ke bawah.
  }
  return value.replace(/\/+$/, '').toLowerCase();
}
