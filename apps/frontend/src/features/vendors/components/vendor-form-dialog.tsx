import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { useCreateVendor, useUpdateVendor } from '../hooks/use-vendors';
import type { Vendor, VendorFormValues } from '../types/vendor.types';
import { useCrudForm } from '@/lib/use-crud-form';

const EMPTY_FORM: VendorFormValues = {
  name: '',
  contactPerson: '',
  phone: '',
  email: '',
  address: '',
  status: 'ACTIVE',
  remarks: '',
};

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  vendor?: Vendor | null;
}

export function VendorFormDialog({ open, onOpenChange, vendor }: Props) {
  const { form, setForm, isEdit, isSaving, handleSubmit } = useCrudForm<Vendor, VendorFormValues>({
    open,
    entity: vendor,
    emptyForm: EMPTY_FORM,
    mapToForm: (v) => ({
      name: v.name,
      contactPerson: v.contactPerson ?? '',
      phone: v.phone ?? '',
      email: v.email ?? '',
      address: v.address ?? '',
      status: v.status,
      remarks: v.remarks ?? '',
    }),
    createMutation: useCreateVendor(),
    updateMutation: useUpdateVendor(),
    getId: (v) => v.id,
    onSuccess: () => onOpenChange(false),
    successMessage: { create: 'Vendor berhasil ditambahkan', update: 'Vendor berhasil diperbarui' },
    errorMessage: 'Gagal menyimpan vendor',
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Vendor' : 'Tambah Vendor'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="name">Nama Vendor</Label>
            <Input
              id="name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="PT Kalibrasi Nusantara"
              maxLength={150}
              required
            />
          </div>

          <div>
            <Label htmlFor="contactPerson">Contact Person</Label>
            <Input
              id="contactPerson"
              value={form.contactPerson}
              onChange={(e) => setForm({ ...form, contactPerson: e.target.value })}
              maxLength={100}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="phone">Phone</Label>
              <Input id="phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} maxLength={30} />
            </div>
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                maxLength={150}
              />
            </div>
          </div>

          <div>
            <Label htmlFor="address">Address</Label>
            <Input id="address" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} maxLength={255} />
          </div>

          <div>
            <Label htmlFor="status">Status</Label>
            <Select
              id="status"
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value as VendorFormValues['status'] })}
            >
              <option value="ACTIVE">Active</option>
              <option value="INACTIVE">Inactive</option>
            </Select>
          </div>

          <div>
            <Label htmlFor="remarks">Remarks</Label>
            <Input id="remarks" value={form.remarks} onChange={(e) => setForm({ ...form, remarks: e.target.value })} maxLength={500} />
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
