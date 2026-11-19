import { renderHook, act } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { toast } from 'sonner';
import { useCrudForm } from './use-crud-form';

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

interface Entity {
  id: string;
  name: string;
}
interface FormValues {
  name: string;
}

const EMPTY_FORM: FormValues = { name: '' };

function makeMutation(impl: (arg: any) => Promise<unknown> = vi.fn().mockResolvedValue(undefined)) {
  return { mutateAsync: vi.fn(impl), isPending: false };
}

describe('useCrudForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('mode create saat entity null, form kosong', () => {
    const { result } = renderHook(() =>
      useCrudForm<Entity, FormValues>({
        open: true,
        entity: null,
        emptyForm: EMPTY_FORM,
        mapToForm: (e) => ({ name: e.name }),
        createMutation: makeMutation(),
        updateMutation: makeMutation(),
        getId: (e) => e.id,
        onSuccess: vi.fn(),
        successMessage: { create: 'dibuat', update: 'diupdate' },
      }),
    );

    expect(result.current.isEdit).toBe(false);
    expect(result.current.form).toEqual({ name: '' });
  });

  it('mode edit saat entity ada, form di-reset dari mapToForm', () => {
    const entity: Entity = { id: '1', name: 'Area A' };
    const { result } = renderHook(() =>
      useCrudForm<Entity, FormValues>({
        open: true,
        entity,
        emptyForm: EMPTY_FORM,
        mapToForm: (e) => ({ name: e.name }),
        createMutation: makeMutation(),
        updateMutation: makeMutation(),
        getId: (e) => e.id,
        onSuccess: vi.fn(),
        successMessage: { create: 'dibuat', update: 'diupdate' },
      }),
    );

    expect(result.current.isEdit).toBe(true);
    expect(result.current.form).toEqual({ name: 'Area A' });
  });

  it('submit mode create memanggil createMutation dan toast sukses, lalu onSuccess', async () => {
    const createMutation = makeMutation();
    const onSuccess = vi.fn();
    const { result } = renderHook(() =>
      useCrudForm<Entity, FormValues>({
        open: true,
        entity: null,
        emptyForm: EMPTY_FORM,
        mapToForm: (e) => ({ name: e.name }),
        createMutation,
        updateMutation: makeMutation(),
        getId: (e) => e.id,
        onSuccess,
        successMessage: { create: 'Berhasil dibuat', update: 'diupdate' },
      }),
    );

    act(() => result.current.setForm({ name: 'Area Baru' }));
    await act(async () => {
      await result.current.handleSubmit({ preventDefault: vi.fn() } as any);
    });

    expect(createMutation.mutateAsync).toHaveBeenCalledWith({ name: 'Area Baru' });
    expect(toast.success).toHaveBeenCalledWith('Berhasil dibuat');
    expect(onSuccess).toHaveBeenCalled();
  });

  it('submit mode edit memanggil updateMutation dengan {id, payload}', async () => {
    const entity: Entity = { id: '7', name: 'Lama' };
    const updateMutation = makeMutation();
    const onSuccess = vi.fn();
    const { result } = renderHook(() =>
      useCrudForm<Entity, FormValues>({
        open: true,
        entity,
        emptyForm: EMPTY_FORM,
        mapToForm: (e) => ({ name: e.name }),
        createMutation: makeMutation(),
        updateMutation,
        getId: (e) => e.id,
        onSuccess,
        successMessage: { create: 'dibuat', update: 'Berhasil diupdate' },
      }),
    );

    await act(async () => {
      await result.current.handleSubmit({ preventDefault: vi.fn() } as any);
    });

    expect(updateMutation.mutateAsync).toHaveBeenCalledWith({ id: '7', payload: { name: 'Lama' } });
    expect(toast.success).toHaveBeenCalledWith('Berhasil diupdate');
    expect(onSuccess).toHaveBeenCalled();
  });

  it('gagal submit menampilkan toast error dan TIDAK memanggil onSuccess', async () => {
    const createMutation = makeMutation(() => Promise.reject({ response: { data: { message: 'Duplikat' } } }));
    const onSuccess = vi.fn();
    const { result } = renderHook(() =>
      useCrudForm<Entity, FormValues>({
        open: true,
        entity: null,
        emptyForm: EMPTY_FORM,
        mapToForm: (e) => ({ name: e.name }),
        createMutation,
        updateMutation: makeMutation(),
        getId: (e) => e.id,
        onSuccess,
        successMessage: { create: 'dibuat', update: 'diupdate' },
      }),
    );

    await act(async () => {
      await result.current.handleSubmit({ preventDefault: vi.fn() } as any);
    });

    expect(toast.error).toHaveBeenCalledWith('Duplikat');
    expect(onSuccess).not.toHaveBeenCalled();
  });

  it('mapToPayload mentransformasi form sebelum dikirim ke mutation', async () => {
    const createMutation = makeMutation();
    const { result } = renderHook(() =>
      useCrudForm<Entity, FormValues>({
        open: true,
        entity: null,
        emptyForm: EMPTY_FORM,
        mapToForm: (e) => ({ name: e.name }),
        createMutation,
        updateMutation: makeMutation(),
        getId: (e) => e.id,
        onSuccess: vi.fn(),
        successMessage: { create: 'dibuat', update: 'diupdate' },
        mapToPayload: (f) => ({ name: f.name.trim() || 'default' }),
      }),
    );

    act(() => result.current.setForm({ name: '  ' }));
    await act(async () => {
      await result.current.handleSubmit({ preventDefault: vi.fn() } as any);
    });

    expect(createMutation.mutateAsync).toHaveBeenCalledWith({ name: 'default' });
  });

  it('omitOnUpdate menghapus field dari payload HANYA saat update, bukan saat create', async () => {
    interface UserForm {
      name: string;
      password: string;
    }
    const entity: Entity = { id: '1', name: 'Budi' };
    const createMutation = makeMutation();
    const updateMutation = makeMutation();

    const { result, rerender } = renderHook(
      ({ entity }) =>
        useCrudForm<Entity, UserForm>({
          open: true,
          entity,
          emptyForm: { name: '', password: '' },
          mapToForm: (e) => ({ name: e.name, password: '' }),
          createMutation,
          updateMutation,
          getId: (e) => e.id,
          onSuccess: vi.fn(),
          successMessage: { create: 'dibuat', update: 'diupdate' },
          omitOnUpdate: ['password'],
        }),
      { initialProps: { entity: null as Entity | null } },
    );

    // Mode create: password tetap terkirim.
    act(() => result.current.setForm({ name: 'Budi', password: 'rahasia' }));
    await act(async () => {
      await result.current.handleSubmit({ preventDefault: vi.fn() } as any);
    });
    expect(createMutation.mutateAsync).toHaveBeenCalledWith({ name: 'Budi', password: 'rahasia' });

    // Mode edit: password TIDAK ikut dikirim ke update.
    rerender({ entity });
    await act(async () => {
      await result.current.handleSubmit({ preventDefault: vi.fn() } as any);
    });
    expect(updateMutation.mutateAsync).toHaveBeenCalledWith({ id: '1', payload: { name: 'Budi' } });
  });

  it('isSaving true kalau salah satu mutation isPending', () => {
    const { result } = renderHook(() =>
      useCrudForm<Entity, FormValues>({
        open: true,
        entity: null,
        emptyForm: EMPTY_FORM,
        mapToForm: (e) => ({ name: e.name }),
        createMutation: { mutateAsync: vi.fn(), isPending: true },
        updateMutation: makeMutation(),
        getId: (e) => e.id,
        onSuccess: vi.fn(),
        successMessage: { create: 'dibuat', update: 'diupdate' },
      }),
    );

    expect(result.current.isSaving).toBe(true);
  });
});
