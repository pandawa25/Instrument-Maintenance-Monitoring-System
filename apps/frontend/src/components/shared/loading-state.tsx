import { Loader2 } from 'lucide-react';

// Dipakai menggantikan teks polos "Memuat data..." di semua tabel modul.
export function LoadingState({ message = 'Memuat data...' }: { message?: string }) {
  return (
    <div className="flex items-center justify-center gap-2 p-10 text-sm text-text-muted">
      <Loader2 className="h-4 w-4 animate-spin" />
      {message}
    </div>
  );
}
