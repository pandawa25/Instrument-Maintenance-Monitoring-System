import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useCreatePmActivityType, useUpdatePmActivityType } from '../hooks/use-pm-activity-types';
import type { PmActivityType, PmActivityTypeFormValues } from '../types/pm-activity-type.types';
import { useCrudForm } from '@/lib/use-crud-form';

const EMPTY_FORM: PmActivityTypeFormValues = { code: '', name: '', description: '' };

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  activityType?: PmActivityType | null;
}

export function PmActivityTypeFormDialog({ open, onOpenChange, activityType }: Props) {
  const { form, setForm, isEdit, isSaving, handleSubmit } = useCrudForm<PmActivityType, PmActivityTypeFormValues>({
    open,
    entity: activityType,
    emptyForm: EMPTY_FORM,
    mapToForm: (a) => ({ code: a.code, name: a.name, description: a.description ?? '' }),
    createMutation: useCreatePmActivityType(),
    updateMutation: useUpdatePmActivityType(),
    getId: (a) => a.id,
    onSuccess: () => onOpenChange(false),
    successMessage: { create: 'Activity type berhasil ditambahkan', update: 'Activity type berhasil diperbarui' },
    errorMessage: 'Gagal menyimpan activity type',
    mapToPayload: (f) => ({ ...f, description: f.description || undefined }),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit PM Activity Type' : 'Tambah PM Activity Type'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="code">Code</Label>
            <Input
              id="code"
              value={form.code}
              onChange={(e) => setForm({ ...form, code: e.target.value })}
              placeholder="CAL"
              maxLength={20}
              required
            />
          </div>

          <div>
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Calibration"
              maxLength={100}
              required
            />
          </div>

          <div>
            <Label htmlFor="description">Description</Label>
            <Input
              id="description"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              maxLength={255}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Batal
            </Button>
            <Button type="submit" disabled={isSaving}>
              {isSaving ? 'Menyimpan...' : 'Simpan'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
