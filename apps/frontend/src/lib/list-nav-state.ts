import type { Location } from 'react-router-dom';

/**
 * Lanjutan fix "filter tidak mengunci" (lihat use-query-params-state.ts).
 *
 * Filter list sudah disimpan di URL (?status=ACTIVE dst), tapi tombol "Kembali ke Daftar"
 * di halaman detail (mis. EquipmentDetailPage) sebelumnya `navigate('/equipment')` — path
 * bersih tanpa query string. Jadi walau filter sudah ada di URL list, tombol back itu
 * sendiri yang membuangnya saat kembali.
 *
 * Fix: list page titip URL dirinya sendiri (termasuk query string filter yang aktif) lewat
 * `location.state.from` saat navigate ke halaman detail. Halaman detail baca balik lewat
 * `resolveBackTo()` saat tombol "Kembali" ditekan, dengan fallback ke `fallbackPath` untuk
 * kasus halaman detail dibuka langsung (deep link / dibagikan, tanpa lewat list page —
 * location.state tidak ada).
 */
export function withBackState<S extends Record<string, unknown> | undefined = undefined>(
  location: Pick<Location, 'pathname' | 'search'>,
  extraState?: S,
): { from: string } & S {
  return { ...(extraState as S), from: `${location.pathname}${location.search}` } as { from: string } & S;
}

export function resolveBackTo(location: Pick<Location, 'state'>, fallbackPath: string): string {
  const state = location.state as { from?: string } | null;
  return state?.from || fallbackPath;
}
