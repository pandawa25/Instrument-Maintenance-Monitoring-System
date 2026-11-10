import { useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';

/**
 * Pengganti `useState(DEFAULT_PARAMS)` untuk state filter/pagination di list page.
 *
 * Root cause bug "filter tidak mengunci": filter sebelumnya disimpan di React state biasa.
 * Begitu user pindah ke halaman detail (route terpisah, mis. /equipment/:id) lalu menekan
 * Back, komponen list page di-unmount lalu di-mount ulang dari awal -> state React hilang
 * dan filter balik ke DEFAULT_PARAMS, padahal URL sebelumnya (mis. dari sidebar) sama.
 *
 * Fix-nya: simpan filter di URL query string lewat useSearchParams, bukan di memory
 * komponen. Saat list page di-mount ulang, filter dibaca lagi dari URL -> otomatis
 * "terkunci". Ini juga bikin filter bisa di-bookmark/dibagikan dan selaras dengan tombol
 * Back browser (pola yang sama sudah dipakai di MaintenanceHistoryPage untuk ?equipmentId=).
 *
 * API-nya sengaja dibuat mirip `useState<T>(initial)` -> [params, setParams] (termasuk
 * setParams menerima updater function `(prev) => next`) supaya migrasi di tiap list page
 * cuma ganti pemanggilan hook-nya, tanpa mengubah logic filter yang sudah ada.
 *
 * Catatan: value yang SAMA dengan default (termasuk '' / undefined) tidak ditulis ke URL,
 * supaya URL tetap bersih (mis. "/equipment?status=ACTIVE" bukan "...&search=&areaId=").
 */
export function useQueryParamsState<T extends object>(
  defaults: T,
): [T, (updater: T | ((prev: T) => T)) => void] {
  const [searchParams, setSearchParams] = useSearchParams();
  const defaultsRecord = defaults as Record<string, unknown>;

  const params = useMemo(() => {
    const result: Record<string, unknown> = { ...defaultsRecord };
    Object.keys(defaultsRecord).forEach((key) => {
      const raw = searchParams.get(key);
      if (raw === null) return;
      const defaultValue = defaultsRecord[key];
      result[key] = typeof defaultValue === 'number' ? Number(raw) || defaultValue : raw;
    });
    return result as T;
    // searchParams dari react-router sudah stabil secara value (berubah referensi hanya
    // kalau query string-nya benar-benar berubah), jadi aman sebagai satu-satunya dependency.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const setParams = useCallback(
    (updater: T | ((prev: T) => T)) => {
      const next = (typeof updater === 'function' ? (updater as (prev: T) => T)(params) : updater) as Record<
        string,
        unknown
      >;
      const nextSearchParams = new URLSearchParams();
      Object.keys(next).forEach((key) => {
        const value = next[key];
        const defaultValue = defaultsRecord[key];
        const isEmpty = value === undefined || value === null || value === '';
        if (isEmpty || value === defaultValue) return;
        nextSearchParams.set(key, String(value));
      });
      // replace:true -> ganti entry history yang sama, bukan menambah entry baru per
      // perubahan filter. Entry history "masuk ke list page" tetap satu, isinya saja yang
      // diperbarui, jadi tombol Back dari halaman detail balik ke 1 langkah seperti biasa.
      setSearchParams(nextSearchParams, { replace: true });
    },
    [params, defaultsRecord, setSearchParams],
  );

  return [params, setParams];
}
