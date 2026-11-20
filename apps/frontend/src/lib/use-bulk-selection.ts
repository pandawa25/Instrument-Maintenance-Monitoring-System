import { useCallback, useEffect, useState } from 'react';

/**
 * State pilihan baris (checkbox) untuk aksi massal di tabel master.
 *
 * Sebelumnya logic ini ditulis ulang inline di equipment-list-page.tsx (selectedIds,
 * toggleSelectOne, toggleSelectAll, reset via useEffect saat `params` berubah). Hook ini
 * mengekstrak pola yang sama supaya Area/Vendor/Instrument Name/PM Activity Type tidak
 * menulis ulang 4 potong state yang identik secara struktur (lihat docs/roadmap.md).
 *
 * `resetKey` dilewatkan dari luar (biasanya object `params` query) — saat nilainya berubah
 * (filter/search/pindah halaman), pilihan lama otomatis dikosongkan karena baris yang
 * tadinya terpilih sudah tidak terlihat lagi di halaman baru (mencegah kebingungan "kok
 * masih ada yang terpilih padahal barisnya sudah beda").
 */
export function useBulkSelection<T>(items: T[], getId: (item: T) => string, resetKey?: unknown) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    setSelectedIds(new Set());
    // Sengaja hanya depend ke resetKey — bukan ke `items`/`getId`, supaya refetch dengan
    // data yang sama (misal refetch saat window focus) tidak ikut mengosongkan pilihan.
    // (Catatan: versi eslint-plugin-react-hooks saat ini sudah tidak memperingatkan
    // dependency ini meski `items`/`getId` tidak diikutkan, jadi directive disable di
    // bawah dulu dibuang — "unused eslint-disable" sekarang jadi error, bukan warning.)
  }, [resetKey]);

  const toggleAll = useCallback(() => {
    setSelectedIds((cur) =>
      cur.size === items.length && items.length > 0 ? new Set() : new Set(items.map(getId)),
    );
  }, [items, getId]);

  const toggleOne = useCallback((id: string) => {
    setSelectedIds((cur) => {
      const next = new Set(cur);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const clear = useCallback(() => setSelectedIds(new Set()), []);

  return {
    selectedIds,
    selectedCount: selectedIds.size,
    isAllSelected: items.length > 0 && selectedIds.size === items.length,
    toggleAll,
    toggleOne,
    clear,
  };
}
