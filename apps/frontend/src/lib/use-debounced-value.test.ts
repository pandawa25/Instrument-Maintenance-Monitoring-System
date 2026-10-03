import { renderHook, act } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useDebouncedValue } from './use-debounced-value';

describe('useDebouncedValue', () => {
  it('langsung mengembalikan value awal saat render pertama', () => {
    const { result } = renderHook(() => useDebouncedValue('a', 300));
    expect(result.current).toBe('a');
  });

  it('TIDAK update value sebelum delay terlewati', () => {
    vi.useFakeTimers();
    const { result, rerender } = renderHook(({ value }) => useDebouncedValue(value, 300), {
      initialProps: { value: 'a' },
    });

    rerender({ value: 'ab' });
    act(() => {
      vi.advanceTimersByTime(299);
    });

    expect(result.current).toBe('a');
    vi.useRealTimers();
  });

  it('update value setelah delay terlewati', () => {
    vi.useFakeTimers();
    const { result, rerender } = renderHook(({ value }) => useDebouncedValue(value, 300), {
      initialProps: { value: 'a' },
    });

    rerender({ value: 'ab' });
    act(() => {
      vi.advanceTimersByTime(300);
    });

    expect(result.current).toBe('ab');
    vi.useRealTimers();
  });

  it('mengetik beruntun hanya menghasilkan 1 update akhir (debounce, bukan throttle)', () => {
    vi.useFakeTimers();
    const { result, rerender } = renderHook(({ value }) => useDebouncedValue(value, 300), {
      initialProps: { value: '' },
    });

    rerender({ value: 'p' });
    act(() => vi.advanceTimersByTime(100));
    rerender({ value: 'pr' });
    act(() => vi.advanceTimersByTime(100));
    rerender({ value: 'pre' });
    act(() => vi.advanceTimersByTime(100));
    // Total 300ms sudah lewat, tapi tiap rerender me-reset timer (lihat
    // clearTimeout di cleanup useEffect) — jadi SETIAP keystroke di tengah jalan
    // membatalkan timer sebelumnya, nilai belum ter-update sama sekali.
    expect(result.current).toBe('');

    act(() => vi.advanceTimersByTime(300));
    expect(result.current).toBe('pre');
    vi.useRealTimers();
  });
});
