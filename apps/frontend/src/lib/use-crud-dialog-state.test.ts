import { renderHook, act } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { toast } from 'sonner';
import { useCrudDialogState, useCrudDelete } from './use-crud-dialog-state';

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

interface Entity {
  id: string;
  name: string;
}

describe('useCrudDialogState', () => {
  it('openCreate membuka form dengan editingItem null', () => {
    const { result } = renderHook(() => useCrudDialogState<Entity>());

    act(() => result.current.openCreate());

    expect(result.current.formOpen).toBe(true);
    expect(result.current.editingItem).toBeNull();
  });

  it('openEdit membuka form dengan item yang dipilih', () => {
    const { result } = renderHook(() => useCrudDialogState<Entity>());
    const item: Entity = { id: '1', name: 'Area A' };

    act(() => result.current.openEdit(item));

    expect(result.current.formOpen).toBe(true);
    expect(result.current.editingItem).toEqual(item);
  });

  it('openView/closeView mengatur viewingItem', () => {
    const { result } = renderHook(() => useCrudDialogState<Entity>());
    const item: Entity = { id: '1', name: 'Area A' };

    act(() => result.current.openView(item));
    expect(result.current.viewingItem).toEqual(item);

    act(() => result.current.closeView());
    expect(result.current.viewingItem).toBeNull();
  });

  it('openDelete/closeDelete mengatur deletingItem', () => {
    const { result } = renderHook(() => useCrudDialogState<Entity>());
    const item: Entity = { id: '1', name: 'Area A' };

    act(() => result.current.openDelete(item));
    expect(result.current.deletingItem).toEqual(item);

    act(() => result.current.closeDelete());
    expect(result.current.deletingItem).toBeNull();
  });
});

describe('useCrudDelete', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('confirmDelete sukses: panggil mutateAsync, toast sukses, clear deletingItem', async () => {
    const mutateAsync = vi.fn().mockResolvedValue(undefined);
    const { result } = renderHook(() =>
      useCrudDelete<Entity>({
        deleteMutation: { mutateAsync, isPending: false },
        getId: (e) => e.id,
        successMessage: (e) => `${e.name} berhasil dihapus`,
      }),
    );

    act(() => result.current.setDeletingItem({ id: '1', name: 'Area A' }));
    await act(async () => {
      await result.current.confirmDelete();
    });

    expect(mutateAsync).toHaveBeenCalledWith('1');
    expect(toast.success).toHaveBeenCalledWith('Area A berhasil dihapus');
    expect(result.current.deletingItem).toBeNull();
  });

  it('confirmDelete gagal: toast error, deletingItem TIDAK di-clear (biar dialog tetap terbuka)', async () => {
    const mutateAsync = vi.fn().mockRejectedValue({ response: { data: { message: 'Masih ada equipment aktif' } } });
    const { result } = renderHook(() =>
      useCrudDelete<Entity>({
        deleteMutation: { mutateAsync, isPending: false },
        getId: (e) => e.id,
        successMessage: (e) => `${e.name} berhasil dihapus`,
      }),
    );

    act(() => result.current.setDeletingItem({ id: '1', name: 'Area A' }));
    await act(async () => {
      await result.current.confirmDelete();
    });

    expect(toast.error).toHaveBeenCalledWith('Masih ada equipment aktif');
    expect(result.current.deletingItem).toEqual({ id: '1', name: 'Area A' });
  });

  it('confirmDelete no-op kalau deletingItem null', async () => {
    const mutateAsync = vi.fn();
    const { result } = renderHook(() =>
      useCrudDelete<Entity>({
        deleteMutation: { mutateAsync, isPending: false },
        getId: (e) => e.id,
        successMessage: (e) => `${e.name} dihapus`,
      }),
    );

    await act(async () => {
      await result.current.confirmDelete();
    });

    expect(mutateAsync).not.toHaveBeenCalled();
  });
});
