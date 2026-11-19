import { renderHook, act } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { toast } from 'sonner';
import { useBulkAction } from './use-bulk-action';

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

describe('useBulkAction', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('semua sukses: toast success dengan jumlah, return {succeeded, failed}', async () => {
    const action = vi.fn().mockResolvedValue(undefined);
    const { result } = renderHook(() =>
      useBulkAction({
        action,
        successMessage: (count) => `${count} berhasil dihapus`,
        failureMessage: (s, f) => `${s} berhasil, ${f} gagal`,
      }),
    );

    let outcome: { succeeded: number; failed: number } | undefined;
    await act(async () => {
      outcome = await result.current.run(['1', '2', '3']);
    });

    expect(action).toHaveBeenCalledTimes(3);
    expect(toast.success).toHaveBeenCalledWith('3 berhasil dihapus');
    expect(toast.error).not.toHaveBeenCalled();
    expect(outcome).toEqual({ succeeded: 3, failed: 0 });
  });

  it('sebagian gagal: toast error dengan rincian sukses/gagal, tidak melempar exception', async () => {
    const action = vi.fn().mockImplementation((id: string) =>
      id === '2' ? Promise.reject(new Error('conflict')) : Promise.resolve(undefined),
    );
    const { result } = renderHook(() =>
      useBulkAction({
        action,
        successMessage: (count) => `${count} berhasil dihapus`,
        failureMessage: (s, f) => `${s} berhasil, ${f} gagal`,
      }),
    );

    let outcome: { succeeded: number; failed: number } | undefined;
    await act(async () => {
      outcome = await result.current.run(['1', '2', '3']);
    });

    expect(toast.error).toHaveBeenCalledWith('2 berhasil, 1 gagal');
    expect(toast.success).not.toHaveBeenCalled();
    expect(outcome).toEqual({ succeeded: 2, failed: 1 });
  });

  it('semua gagal: toast error, succeeded 0', async () => {
    const action = vi.fn().mockRejectedValue(new Error('conflict'));
    const { result } = renderHook(() =>
      useBulkAction({
        action,
        successMessage: (count) => `${count} berhasil`,
        failureMessage: (s, f) => `${s} berhasil, ${f} gagal`,
      }),
    );

    await act(async () => {
      await result.current.run(['1', '2']);
    });

    expect(toast.error).toHaveBeenCalledWith('0 berhasil, 2 gagal');
  });

  it('isRunning true selama proses, false setelah selesai', async () => {
    let resolveAction: () => void = () => {};
    const action = vi.fn().mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          resolveAction = resolve;
        }),
    );
    const { result } = renderHook(() =>
      useBulkAction({
        action,
        successMessage: () => 'ok',
        failureMessage: () => 'fail',
      }),
    );

    expect(result.current.isRunning).toBe(false);

    let runPromise: Promise<unknown>;
    act(() => {
      runPromise = result.current.run(['1']);
    });

    expect(result.current.isRunning).toBe(true);

    await act(async () => {
      resolveAction();
      await runPromise!;
    });

    expect(result.current.isRunning).toBe(false);
  });

  it('array id kosong: tidak memanggil action, toast success dengan 0', async () => {
    const action = vi.fn();
    const { result } = renderHook(() =>
      useBulkAction({
        action,
        successMessage: (count) => `${count} berhasil`,
        failureMessage: (s, f) => `${s}/${f}`,
      }),
    );

    await act(async () => {
      await result.current.run([]);
    });

    expect(action).not.toHaveBeenCalled();
    expect(toast.success).toHaveBeenCalledWith('0 berhasil');
  });
});
