import type { KeyboardEvent, MouseEvent } from 'react';

// Elemen interaktif di dalam baris punya aksinya sendiri — klik padanya tidak boleh ikut membuka detail.
const INTERACTIVE = 'button, a, input, select, textarea, label, [role="button"], [role="checkbox"]';

/**
 * Props untuk <tr> data: styling seragam (zebra/hover, lihat `.data-row` di index.css) dan,
 * bila `onOpen` diberikan, seluruh baris bisa diklik untuk membuka detail.
 * Pemakaian: <tr key={id} {...dataRowProps(() => onView(item))}>
 *
 * Keyboard (Risk #24, docs/roadmap.md): baris diberi tabIndex=0 supaya bisa di-Tab,
 * dan Enter/Space membuka detail — sebelumnya pembukaan lewat keyboard HANYA lewat
 * tombol View/Tag Number di dalam baris (baris sendiri tidak fokus-able). `role="button"`
 * SENGAJA tidak dipasang di <tr> — itu akan menghilangkan semantik "baris tabel" untuk
 * screen reader (AT tidak lagi mengumumkan posisi kolom/baris). Trade-off yang diterima:
 * AT tetap mendengar "row", tapi tidak otomatis tahu baris itu "clickable" sampai
 * mencoba Enter/Space — konsisten dengan batasan yang sudah didokumentasikan sebelumnya
 * di roadmap (Risk #15), bukan solusi sempurna tapi perbaikan nyata dari kondisi
 * sebelumnya (tidak bisa dibuka lewat keyboard sama sekali tanpa mencari tombol View).
 */
export function dataRowProps(onOpen?: () => void) {
  if (!onOpen) return { className: 'data-row' };
  return {
    className: 'data-row data-row-click',
    tabIndex: 0,
    onClick: (e: MouseEvent<HTMLElement>) => {
      if ((e.target as HTMLElement).closest(INTERACTIVE)) return;
      onOpen();
    },
    onKeyDown: (e: KeyboardEvent<HTMLElement>) => {
      if (e.key !== 'Enter' && e.key !== ' ') return;
      if ((e.target as HTMLElement).closest(INTERACTIVE)) return;
      e.preventDefault();
      onOpen();
    },
  };
}
