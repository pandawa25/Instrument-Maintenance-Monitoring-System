import { useCallback, useState } from 'react';
import { toast } from 'sonner';
import { getErrorMessage } from './axios';

/**
 * State dialog Create/Edit/View/Delete yang berulang persis di setiap *-list-page.tsx
 * (formOpen, editingItem, viewingItem, deletingItem + openCreate/openEdit).
 *
 * Lihat docs/roadmap.md Risk #5 — sebelumnya setiap modul (Area, Vendor, Instrument Name,
 * dst) menulis ulang 4 useState + 2 handler yang identik secara struktur, cuma beda nama
 * entity. Hook ini menggantikan itu tanpa mengubah kontrak komponen dialog (tetap terima
 * open/onOpenChange/item seperti biasa) — jadi migrasinya aman dilakukan modul per modul.
 */
export function useCrudDialogState<T>() {
  const [formOpen, setFormOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<T | null>(null);
  const [viewingItem, setViewingItem] = useState<T | null>(null);
  const [deletingItem, setDeletingItem] = useState<T | null>(null);

  const openCreate = useCallback(() => {
    setEditingItem(null);
    setFormOpen(true);
  }, []);

  const openEdit = useCallback((item: T) => {
    setEditingItem(item);
    setFormOpen(true);
  }, []);

  const openView = useCallback((item: T) => {
    setViewingItem(item);
  }, []);

  const closeView = useCallback(() => setViewingItem(null), []);

  const openDelete = useCallback((item: T) => {
    setDeletingItem(item);
  }, []);

  const closeDelete = useCallback(() => setDeletingItem(null), []);

  return {
    formOpen,
    setFormOpen,
    editingItem,
    viewingItem,
    deletingItem,
    openCreate,
    openEdit,
    openView,
    closeView,
    openDelete,
    closeDelete,
  };
}

interface UseCrudDeleteOptions<T> {
  /** Mutation delete dari TanStack Query — cukup butuh mutateAsync + isPending. */
  deleteMutation: { mutateAsync: (id: string) => Promise<unknown>; isPending: boolean };
  getId: (item: T) => string;
  successMessage: (item: T) => string;
  errorMessage?: string;
}

/**
 * Pola confirm-delete yang berulang di setiap list-page: try/catch + toast + tutup dialog.
 * Dipisah dari useCrudDialogState supaya bisa dipakai sendiri di tempat yang tidak butuh
 * form create/edit (misal halaman yang hanya punya delete, atau konteks lain).
 */
export function useCrudDelete<T>({ deleteMutation, getId, successMessage, errorMessage }: UseCrudDeleteOptions<T>) {
  const [deletingItem, setDeletingItem] = useState<T | null>(null);

  const confirmDelete = useCallback(async () => {
    if (!deletingItem) return;
    try {
      await deleteMutation.mutateAsync(getId(deletingItem));
      toast.success(successMessage(deletingItem));
      setDeletingItem(null);
    } catch (err) {
      toast.error(getErrorMessage(err, errorMessage ?? 'Gagal menghapus data'));
    }
  }, [deletingItem, deleteMutation, getId, successMessage, errorMessage]);

  return {
    deletingItem,
    setDeletingItem,
    confirmDelete,
    isDeleting: deleteMutation.isPending,
  };
}
