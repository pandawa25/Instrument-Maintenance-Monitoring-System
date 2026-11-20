import { useCallback, useState } from 'react';
import { toast } from 'sonner';
import { getErrorMessage } from './axios';
import { notifyHighlightToggled } from './highlight-toast';

interface UseHighlightConfirmOptions<T> {
  /** Mutation toggle highlight dari TanStack Query — cukup butuh mutateAsync + isPending. */
  toggleMutation: { mutateAsync: (vars: { id: string; isHighlighted: boolean }) => Promise<unknown>; isPending: boolean };
  getId: (item: T) => string;
  getIsHighlighted: (item: T) => boolean;
  /** Label singkat buat ditampilkan di dialog konfirmasi, misal tag equipment / nomor WO. */
  getLabel?: (item: T) => string;
}

/**
 * Pola konfirmasi-sebelum-toggle Highlight Pekerjaan: klik bintang TIDAK langsung
 * memanggil mutation — cuma membuka HighlightConfirmDialog dulu, baru mutation jalan
 * setelah user menekan "Ya, Tandai"/"Ya, Batalkan". Diminta user supaya tidak ragu
 * "kena atau tidak" saat klik, dengan jeda konfirmasi di depan (bukan cuma toast
 * setelahnya — lihat lib/highlight-toast.ts, tetap dipanggil setelah mutation sukses
 * sebagai konfirmasi kedua).
 *
 * Mengikuti pola useCrudDelete di use-crud-dialog-state.ts (try/catch + toast + tutup
 * dialog), supaya tidak menulis ulang try/catch yang sama di 6 tempat.
 */
export function useHighlightConfirm<T>({ toggleMutation, getId, getIsHighlighted, getLabel }: UseHighlightConfirmOptions<T>) {
  const [pendingItem, setPendingItem] = useState<T | null>(null);

  const requestToggle = useCallback((item: T) => setPendingItem(item), []);
  const cancel = useCallback(() => setPendingItem(null), []);

  const confirmToggle = useCallback(async () => {
    if (!pendingItem) return;
    const next = !getIsHighlighted(pendingItem);
    try {
      await toggleMutation.mutateAsync({ id: getId(pendingItem), isHighlighted: next });
      notifyHighlightToggled(next);
      setPendingItem(null);
    } catch (err) {
      toast.error(getErrorMessage(err, 'Gagal mengubah highlight'));
      setPendingItem(null);
    }
  }, [pendingItem, toggleMutation, getId, getIsHighlighted]);

  return {
    pendingItem,
    pendingId: pendingItem ? getId(pendingItem) : undefined,
    targetHighlighted: pendingItem ? !getIsHighlighted(pendingItem) : false,
    itemLabel: pendingItem && getLabel ? getLabel(pendingItem) : undefined,
    requestToggle,
    cancel,
    confirmToggle,
    isToggling: toggleMutation.isPending,
  };
}
