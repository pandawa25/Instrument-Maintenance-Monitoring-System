import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { getErrorMessage } from './axios';

interface MutationLike<TArg> {
  mutateAsync: (arg: TArg) => Promise<unknown>;
  isPending: boolean;
}

interface UseCrudFormOptions<TEntity, TFormValues> {
  /** State open dari dialog pembungkus — form di-reset setiap kali dialog ini dibuka. */
  open: boolean;
  /** null/undefined = mode create, ada isi = mode edit. */
  entity?: TEntity | null;
  emptyForm: TFormValues;
  /** Map entity (hasil API) ke bentuk form values untuk mode edit. */
  mapToForm: (entity: TEntity) => TFormValues;
  createMutation: MutationLike<TFormValues>;
  updateMutation: MutationLike<{ id: string; payload: Partial<TFormValues> }>;
  getId: (entity: TEntity) => string;
  /** Dipanggil setelah create/update sukses — biasanya `() => onOpenChange(false)`. */
  onSuccess: () => void;
  successMessage: { create: string; update: string };
  errorMessage?: string;
  /**
   * Transformasi opsional sebelum form dikirim ke API (misal ubah string kosong jadi
   * undefined untuk field optional). Default: kirim form apa adanya.
   */
  mapToPayload?: (form: TFormValues) => TFormValues;
}

/**
 * Pola create/edit form-dialog yang berulang di setiap *-form-dialog.tsx (Area, Vendor,
 * Instrument Name, PM Activity Type, dst): state form yang di-reset dari `entity` saat
 * dialog dibuka, flag isEdit, isSaving gabungan dari dua mutation, dan submit handler
 * try/catch/toast/close yang persis sama.
 *
 * Lihat docs/roadmap.md Risk #5. Hook ini TIDAK mengubah markup form sama sekali — cuma
 * menggantikan boilerplate state-nya, jadi migrasi per modul tetap aman dan kecil.
 */
export function useCrudForm<TEntity, TFormValues>({
  open,
  entity,
  emptyForm,
  mapToForm,
  createMutation,
  updateMutation,
  getId,
  onSuccess,
  successMessage,
  errorMessage,
  mapToPayload,
}: UseCrudFormOptions<TEntity, TFormValues>) {
  const [form, setForm] = useState<TFormValues>(emptyForm);
  const isEdit = Boolean(entity);
  const isSaving = createMutation.isPending || updateMutation.isPending;

  useEffect(() => {
    if (open) {
      setForm(entity ? mapToForm(entity) : emptyForm);
    }
    // emptyForm/mapToForm sengaja tidak dimasukkan: keduanya biasanya literal/fungsi baru
    // di setiap render pada call site, memasukkannya ke deps akan membuat form ter-reset
    // terus-menerus selagi dialog masih terbuka (termasuk saat user baru mulai mengetik).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, entity]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      const payload = mapToPayload ? mapToPayload(form) : form;
      if (isEdit && entity) {
        await updateMutation.mutateAsync({ id: getId(entity), payload });
        toast.success(successMessage.update);
      } else {
        await createMutation.mutateAsync(payload);
        toast.success(successMessage.create);
      }
      onSuccess();
    } catch (err) {
      toast.error(getErrorMessage(err, errorMessage ?? 'Gagal menyimpan data'));
    }
  }

  return { form, setForm, isEdit, isSaving, handleSubmit };
}
