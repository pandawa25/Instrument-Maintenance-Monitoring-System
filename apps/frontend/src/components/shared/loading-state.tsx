import { Loader2 } from 'lucide-react';

// Dua mode:
// - Tanpa `message` (default, dipakai di hampir semua tabel modul): skeleton
//   shimmer baris×kolom. Skeleton dipilih di atas spinner polos karena memberi
//   gambaran struktur konten yang akan muncul, membuat perceived loading time
//   terasa lebih singkat — pola "skeleton loading state" standar untuk data
//   table (lihat ui-ux-pro-max §3).
// - Dengan `message` (dipakai untuk loading full-page/panel non-tabel, mis.
//   App.tsx saat cek sesi, atau panel eksekusi PM): spinner + teks seperti semula.
// `animate-pulse`/`animate-spin` otomatis nonaktif saat prefers-reduced-motion (lihat index.css).
interface Props {
  message?: string;
  rows?: number;
  /** Jumlah kolom skeleton per baris, default meniru tabel 5 kolom. */
  columns?: number;
}

export function LoadingState({ message, rows = 5, columns = 5 }: Props) {
  if (message) {
    return (
      <div className="flex items-center justify-center gap-2 p-10 text-sm text-text-muted" role="status">
        <Loader2 className="h-4 w-4 animate-spin" />
        {message}
      </div>
    );
  }

  return (
    <div className="animate-pulse divide-y divide-border" role="status" aria-label="Memuat data...">
      {Array.from({ length: rows }).map((_, rowIdx) => (
        <div key={rowIdx} className="flex items-center gap-4 px-4 py-3.5">
          {Array.from({ length: columns }).map((__, colIdx) => (
            <div
              key={colIdx}
              className="h-3.5 flex-1 rounded bg-surface-3"
              style={{ maxWidth: colIdx === columns - 1 ? '3rem' : undefined }}
            />
          ))}
        </div>
      ))}
      <span className="sr-only">Memuat data...</span>
    </div>
  );
}
