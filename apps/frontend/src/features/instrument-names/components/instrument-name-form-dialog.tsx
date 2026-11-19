import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useCreateInstrumentName, useUpdateInstrumentName } from '../hooks/use-instrument-names';
import type { InstrumentName, InstrumentNameFormValues } from '../types/instrument-name.types';
import { useCrudForm } from '@/lib/use-crud-form';

const EMPTY_FORM: InstrumentNameFormValues = { code: '', name: '', description: '' };

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  instrumentName?: InstrumentName | null; // null/undefined = mode create
}

export function InstrumentNameFormDialog({ open, onOpenChange, instrumentName }: Props) {
  const { form, setForm, isEdit, isSaving, handleSubmit } = useCrudForm<InstrumentName, InstrumentNameFormValues>({
    open,
    entity: instrumentName,
    emptyForm: EMPTY_FORM,
    mapToForm: (i) => ({ code: i.code, name: i.name, description: i.description ?? '' }),
    createMutation: useCreateInstrumentName(),
    updateMutation: useUpdateInstrumentName(),
    getId: (i) => i.id,
    onSuccess: () => onOpenChange(false),
    successMessage: { create: 'Instrument name berhasil ditambahkan', update: 'Instrument name berhasil diperbarui' },
    errorMessage: 'Gagal menyimpan instrument name',
    mapToPayload: (f) => ({ ...f, description: f.description || undefined }),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Instrument Name' : 'Tambah Instrument Name'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="code">Code</Label>
            <Input
              id="code"
              value={form.code}
              onChange={(e) => setForm({ ...form, code: e.target.value })}
              placeholder="PT"
              maxLength={30}
              required
            />
          </div>

          <div>
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Pressure Transmitter"
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
