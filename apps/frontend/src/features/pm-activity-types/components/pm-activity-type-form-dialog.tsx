import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useCreatePmActivityType, useUpdatePmActivityType } from '../hooks/use-pm-activity-types';
import type { PmActivityType, PmActivityTypeFormValues } from '../types/pm-activity-type.types';
import { getErrorMessage } from '@/lib/axios';

const EMPTY_FORM: PmActivityTypeFormValues = { code: '', name: '', description: '' };

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  activityType?: PmActivityType | null;
}

export function PmActivityTypeFormDialog({ open, onOpenChange, activityType }: Props) {
  const [form, setForm] = useState<PmActivityTypeFormValues>(EMPTY_FORM);
  const createMutation = useCreatePmActivityType();
  const updateMutation = useUpdatePmActivityType();
  const isEdit = Boolean(activityType);
  const isSaving = createMutation.isPending || updateMutation.isPending;

  useEffect(() => {
    if (open) {
      setForm(
        activityType
          ? { code: activityType.code, name: activityType.name, description: activityType.description ?? '' }
          : EMPTY_FORM,
      );
    }
  }, [open, activityType]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      const payload: PmActivityTypeFormValues = { ...form, description: form.description || undefined };
      if (isEdit && activityType) {
        await updateMutation.mutateAsync({ id: activityType.id, payload });
        toast.success('Activity type berhasil diperbarui');
      } else {
        await createMutation.mutateAsync(payload);
        toast.success('Activity type berhasil ditambahkan');
      }
      onOpenChange(false);
    } catch (err: any) {
      toast.error(getErrorMessage(err, 'Gagal menyimpan activity type'));
    }
  }

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
