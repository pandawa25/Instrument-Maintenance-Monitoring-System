import { ArrowDown, ArrowUp, ChevronsUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';

export type SortOrder = 'asc' | 'desc';

export interface SortState<F extends string = string> {
  sortBy?: F | string;
  sortOrder?: SortOrder;
}

interface Props<F extends string> extends SortState<F> {
  /** Label kolom yang ditampilkan. */
  label: string;
  /** Nama field yang dikirim ke API (harus ada di whitelist SORTABLE_FIELDS backend terkait). */
  field: F;
  onSort: (field: F) => void;
  className?: string;
  align?: 'left' | 'right';
}

/**
 * <th> yang bisa diklik untuk sorting — dipakai di semua tabel data list.
 * Klik kolom yang sama = toggle asc/desc; klik kolom lain = mulai dari 'desc'.
 * State sorting (sortBy/sortOrder) hidup di query params halaman pemanggil,
 * supaya ikut terbawa saat pagination/filter lain berubah dan bisa di-deep-link.
 */
export function SortableTh<F extends string>({
  label,
  field,
  sortBy,
  sortOrder,
  onSort,
  className,
  align = 'left',
}: Props<F>) {
  const isActive = sortBy === field;
  const Icon = isActive ? (sortOrder === 'asc' ? ArrowUp : ArrowDown) : ChevronsUpDown;

  return (
    <th className={cn('px-4 py-2.5 font-medium', align === 'right' && 'text-right', className)}>
      <button
        type="button"
        onClick={() => onSort(field)}
        className={cn(
          'inline-flex items-center gap-1 whitespace-nowrap hover:text-text',
          align === 'right' && 'flex-row-reverse',
          isActive && 'text-text',
        )}
        aria-label={`Urutkan berdasarkan ${label}`}
      >
        {label}
        <Icon className={cn('h-3.5 w-3.5 shrink-0', isActive ? 'text-primary' : 'text-text-muted/50')} />
      </button>
    </th>
  );
}

/** Helper umum untuk handler klik header: toggle asc/desc kalau field sama, 'desc' kalau pindah field. */
export function toggleSort<F extends string>(current: SortState<F>, field: F): { sortBy: F; sortOrder: SortOrder } {
  if (current.sortBy === field) {
    return { sortBy: field, sortOrder: current.sortOrder === 'asc' ? 'desc' : 'asc' };
  }
  return { sortBy: field, sortOrder: 'desc' };
}
