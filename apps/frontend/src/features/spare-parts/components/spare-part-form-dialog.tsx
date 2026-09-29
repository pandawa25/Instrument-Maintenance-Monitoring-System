import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { useCreateSparePart, useUpdateSparePart } from '../hooks/use-spare-parts';
import type { SparePart, SparePartFormValues } from '../types/spare-part.types';

const EMPTY_FORM: SparePartFormValues = {
  kimap: '',
  name: '',
  unit: '',
  stock: 0,
  status: 'ACTIVE',
  remarks: '',
};

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sparePart?: SparePart | null;
}

export function SparePartFormDialog({ open, onOpenChange, sparePart }: Props) {
  const [form, setForm] = useState<SparePartFormValues>(EMPTY_FORM);
  const [error, setError] = useState<string | null>(null);
  const createMutation = useCreateSparePart();
  const updateMutation = useUpdateSparePart();
  const isEdit = Boolean(sparePart);
  const isSaving = createMutation.isPending || updateMutation.isPending;

  useEffect(() => {
    if (open) {
      setForm(
        sparePart
          ? {
              kimap: sparePart.kimap,
              name: sparePart.name,
              unit: sparePart.unit,
              stock: sparePart.stock,
              status: sparePart.status,
              remarks: sparePart.remarks ?? '',
            }
          : EMPTY_FORM,
      );
      setError(null);
    }
  }, [open, sparePart]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      const payload: SparePartFormValues = { ...form, stock: form.stock === '' ? 0 : Number(form.stock) };
      if (isEdit && sparePart) {
        await updateMutation.mutateAsync({ id: sparePart.id, payload });
      } else {
        await createMutation.mutateAsync(payload);
      }
      onOpenChange(false);
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'Gagal menyimpan spare part / material');
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Spare Part / Material' : 'Tambah Spare Part / Material'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="kimap">KIMAP</Label>
            <Input
              id="kimap"
              value={form.kimap}
              onChange={(e) => setForm({ ...form, kimap: e.target.value })}
              placeholder="KM-001-2026"
              maxLength={50}
              required
            />
          </div>

          <div>
            <Label htmlFor="name">Nama Material</Label>
            <Input
              id="name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              maxLength={150}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="stock">Stock</Label>
              <Input
                id="stock"
                type="number"
                min={0}
                value={form.stock}
                onChange={(e) => setForm({ ...form, stock: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="unit">Unit</Label>
              <Input
                id="unit"
                value={form.unit}
                onChange={(e) => setForm({ ...form, unit: e.target.value })}
                placeholder="pcs"
                maxLength={20}
                required
              />
            </div>
          </div>

          <div>
            <Label htmlFor="status">Status</Label>
            <Select
              id="status"
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value as SparePartFormValues['status'] })}
            >
              <option value="ACTIVE">Active</option>
              <option value="INACTIVE">Inactive</option>
            </Select>
          </div>

          <div>
            <Label htmlFor="remarks">Remarks</Label>
            <Input id="remarks" value={form.remarks} onChange={(e) => setForm({ ...form, remarks: e.target.value })} maxLength={500} />
          </div>

          {error && <p className="text-sm text-danger">{error}</p>}

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
