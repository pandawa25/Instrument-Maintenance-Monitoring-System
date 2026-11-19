import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { useCreateArea, useUpdateArea } from '../hooks/use-areas';
import type { Area, AreaFormValues } from '../types/area.types';
import { useCrudForm } from '@/lib/use-crud-form';

const EMPTY_FORM: AreaFormValues = { areaCode: '', areaName: '', description: '', status: 'ACTIVE' };

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  area?: Area | null; // null/undefined = mode create
}

export function AreaFormDialog({ open, onOpenChange, area }: Props) {
  const { form, setForm, isEdit, isSaving, handleSubmit } = useCrudForm<Area, AreaFormValues>({
    open,
    entity: area,
    emptyForm: EMPTY_FORM,
    mapToForm: (a) => ({ areaCode: a.areaCode, areaName: a.areaName, description: a.description ?? '', status: a.status }),
    createMutation: useCreateArea(),
    updateMutation: useUpdateArea(),
    getId: (a) => a.id,
    onSuccess: () => onOpenChange(false),
    successMessage: { create: 'Area berhasil ditambahkan', update: 'Area berhasil diperbarui' },
    errorMessage: 'Gagal menyimpan area',
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Area' : 'Tambah Area'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="areaCode">Area Code</Label>
            <Input
              id="areaCode"
              value={form.areaCode}
              onChange={(e) => setForm({ ...form, areaCode: e.target.value })}
              placeholder="PU-01"
              maxLength={20}
              required
            />
          </div>

          <div>
            <Label htmlFor="areaName">Area Name</Label>
            <Input
              id="areaName"
              value={form.areaName}
              onChange={(e) => setForm({ ...form, areaName: e.target.value })}
              placeholder="Process Unit 01"
              maxLength={150}
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

          <div>
            <Label htmlFor="status">Status</Label>
            <Select
              id="status"
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value as AreaFormValues['status'] })}
            >
              <option value="ACTIVE">Active</option>
              <option value="INACTIVE">Inactive</option>
            </Select>
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
