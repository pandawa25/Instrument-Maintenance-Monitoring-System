import { Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface StatusAction {
  label: string;
  onClick: () => void;
  disabled?: boolean;
}

interface Props {
  count: number;
  /** Nama item dalam bentuk tunggal, misal "area", "vendor" — dirender jadi "{count} area dipilih". */
  itemLabel: string;
  onClear: () => void;
  onDelete: () => void;
  isDeleting?: boolean;
  /** Aksi tambahan selain hapus, misal "Set Active" / "Set Inactive" untuk modul yang punya field status. */
  statusActions?: StatusAction[];
}

/**
 * Bar aksi massal yang tampil di atas tabel saat ≥1 baris terpilih.
 *
 * Dipakai bersama `useBulkSelection` — layout/warna mengikuti bar "Edit Massal" yang
 * sudah ada di equipment-list-page.tsx (bg-primary-tint/40) supaya konsisten secara visual
 * dengan modul yang sudah punya bulk action sebelumnya.
 */
export function BulkActionBar({ count, itemLabel, onClear, onDelete, isDeleting, statusActions }: Props) {
  if (count === 0) return null;

  return (
    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border bg-primary-tint/40 px-4 py-2">
      <span className="text-sm text-text">
        {count} {itemLabel} dipilih
      </span>
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="outline" size="sm" onClick={onClear}>
          Batal Pilih
        </Button>
        {statusActions?.map((action) => (
          <Button key={action.label} variant="outline" size="sm" onClick={action.onClick} disabled={action.disabled}>
            {action.label}
          </Button>
        ))}
        <Button variant="danger" size="sm" onClick={onDelete} disabled={isDeleting}>
          <Trash2 className="h-4 w-4" />
          {isDeleting ? 'Menghapus...' : 'Hapus Terpilih'}
        </Button>
      </div>
    </div>
  );
}
