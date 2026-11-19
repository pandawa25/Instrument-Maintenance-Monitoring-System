import { renderHook, act } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { useBulkSelection } from './use-bulk-selection';

interface Entity {
  id: string;
}

const items: Entity[] = [{ id: '1' }, { id: '2' }, { id: '3' }];

describe('useBulkSelection', () => {
  it('toggleOne menambah/menghapus satu id', () => {
    const { result } = renderHook(() => useBulkSelection(items, (i) => i.id));

    act(() => result.current.toggleOne('1'));
    expect(result.current.selectedIds.has('1')).toBe(true);
    expect(result.current.selectedCount).toBe(1);

    act(() => result.current.toggleOne('1'));
    expect(result.current.selectedIds.has('1')).toBe(false);
    expect(result.current.selectedCount).toBe(0);
  });

  it('toggleAll memilih semua item saat belum semua terpilih', () => {
    const { result } = renderHook(() => useBulkSelection(items, (i) => i.id));

    act(() => result.current.toggleAll());

    expect(result.current.selectedCount).toBe(3);
    expect(result.current.isAllSelected).toBe(true);
  });

  it('toggleAll mengosongkan pilihan saat semua sudah terpilih', () => {
    const { result } = renderHook(() => useBulkSelection(items, (i) => i.id));

    act(() => result.current.toggleAll());
    act(() => result.current.toggleAll());

    expect(result.current.selectedCount).toBe(0);
    expect(result.current.isAllSelected).toBe(false);
  });

  it('clear mengosongkan pilihan', () => {
    const { result } = renderHook(() => useBulkSelection(items, (i) => i.id));

    act(() => result.current.toggleOne('1'));
    act(() => result.current.clear());

    expect(result.current.selectedCount).toBe(0);
  });

  it('pilihan otomatis kosong saat resetKey berubah (misal filter/halaman berubah)', () => {
    const { result, rerender } = renderHook(
      ({ resetKey }: { resetKey: number }) => useBulkSelection(items, (i) => i.id, resetKey),
      { initialProps: { resetKey: 1 } },
    );

    act(() => result.current.toggleOne('1'));
    expect(result.current.selectedCount).toBe(1);

    rerender({ resetKey: 2 });
    expect(result.current.selectedCount).toBe(0);
  });

  it('pilihan TIDAK kosong kalau resetKey sama (misal refetch background dengan data identik)', () => {
    const { result, rerender } = renderHook(
      ({ resetKey }: { resetKey: number }) => useBulkSelection(items, (i) => i.id, resetKey),
      { initialProps: { resetKey: 1 } },
    );

    act(() => result.current.toggleOne('1'));
    rerender({ resetKey: 1 });

    expect(result.current.selectedCount).toBe(1);
  });

  it('isAllSelected false kalau items kosong', () => {
    const { result } = renderHook(() => useBulkSelection<Entity>([], (i) => i.id));
    expect(result.current.isAllSelected).toBe(false);
  });
});
