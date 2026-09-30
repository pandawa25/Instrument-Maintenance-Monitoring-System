import type { LucideIcon } from 'lucide-react';
import { Inbox } from 'lucide-react';

interface Props {
  icon?: LucideIcon;
  message: string;
}

// Dipakai menggantikan teks polos "Belum ada data..." di semua tabel modul —
// icon + pesan lebih terasa "dirancang" daripada baris teks kosong.
export function EmptyState({ icon: Icon = Inbox, message }: Props) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 p-10 text-center">
      <div className="flex h-11 w-11 items-center justify-center rounded-full bg-surface-2 text-text-muted">
        <Icon className="h-5 w-5" />
      </div>
      <p className="text-sm text-text-muted">{message}</p>
    </div>
  );
}
