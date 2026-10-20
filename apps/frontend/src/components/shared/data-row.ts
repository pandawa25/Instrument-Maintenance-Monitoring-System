import type { MouseEvent } from 'react';

// Elemen interaktif di dalam baris punya aksinya sendiri — klik padanya tidak boleh ikut membuka detail.
const INTERACTIVE = 'button, a, input, select, textarea, label, [role="button"], [role="checkbox"]';

/**
 * Props untuk <tr> data: styling seragam (zebra/hover, lihat `.data-row` di index.css) dan,
 * bila `onOpen` diberikan, seluruh baris bisa diklik untuk membuka detail.
 * Pemakaian: <tr key={id} {...dataRowProps(() => onView(item))}>
 */
export function dataRowProps(onOpen?: () => void) {
  if (!onOpen) return { className: 'data-row' };
  return {
    className: 'data-row data-row-click',
    onClick: (e: MouseEvent<HTMLElement>) => {
      if ((e.target as HTMLElement).closest(INTERACTIVE)) return;
      onOpen();
    },
  };
}
