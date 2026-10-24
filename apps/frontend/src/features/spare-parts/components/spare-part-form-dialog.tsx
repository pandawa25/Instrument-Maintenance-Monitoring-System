import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { useCreateSparePart, useSparePartDetail, useUpdateSparePart } from '../hooks/use-spare-parts';
import { useAuthStore } from '@/store/auth.store';
import type { SparePart, SparePartFormValues } from '../types/spare-part.types';
import { getErrorMessage } from '@/lib/axios';

const EMPTY_FORM: SparePartFormValues = {
  kimap: '',
  name: '',
  unit: '',
  stock: 0,
  minStock: 0,
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
  const createMutation = useCreateSparePart();
  const updateMutation = useUpdateSparePart();
  const isEdit = Boolean(sparePart);
  const isSaving = createMutation.isPending || updateMutation.isPending;

  // Koreksi saldo awal: khusus Admin (backend juga menolak role lain). Saldo awal diambil dari
  // detail (baris ledger INITIAL_BALANCE) — `sparePart.stock` pada list adalah stock SAAT INI.
  const isAdmin = useAuthStore((s) => s.user?.role === 'Admin');
  const canEditOpening = isEdit && isAdmin;
  const detail = useSparePartDetail(sparePart?.id, open && canEditOpening);
  const [openingStock, setOpeningStock] = useState<string>('');
  const originalOpening = detail.data?.openingStock;
  const currentStock = detail.data?.stock ?? sparePart?.stock ?? 0;
  const openingNumber = openingStock === '' ? NaN : Number(openingStock);
  const openingChanged = originalOpening !== undefined && !Number.isNaN(openingNumber) && openingNumber !== originalOpening;
  const projectedStock = openingChanged ? Math.round((currentStock + openingNumber - (originalOpening ?? 0)) * 100) / 100 : currentStock;
  const openingInvalid = canEditOpening && openingStock !== '' && (Number.isNaN(openingNumber) || openingNumber < 0 || projectedStock < 0);

  // Bergantung pada nilai primitif (bukan objek `detail.data`) supaya ketikan user tidak ter-reset
  // oleh re-render/refetch yang menghasilkan nilai sama.
  useEffect(() => {
    if (originalOpening !== undefined) setOpeningStock(String(originalOpening));
  }, [originalOpening, sparePart?.id, open]);

  useEffect(() => {
    if (open) {
      setForm(
        sparePart
          ? {
              kimap: sparePart.kimap,
              name: sparePart.name,
              unit: sparePart.unit,
              stock: sparePart.stock,
              minStock: sparePart.minStock,
              status: sparePart.status,
              remarks: sparePart.remarks ?? '',
            }
          : EMPTY_FORM,
      );
    }
  }, [open, sparePart]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      const minStock = form.minStock === '' || form.minStock === undefined ? 0 : Number(form.minStock);

      if (isEdit && sparePart) {
        // `stock` sengaja tidak dikirim saat update — sejak Stock Movement
        // Ledger, perubahan stock wajib lewat tombol Stock In / Adjustment
        // supaya selalu tercatat di ledger. minStock boleh diedit langsung
        // (cuma ambang alert, bukan saldo).
        const { stock: _stock, ...updatePayload } = form;
        await updateMutation.mutateAsync({
          id: sparePart.id,
          payload: { ...updatePayload, minStock, ...(canEditOpening && openingChanged ? { openingStock: openingNumber } : {}) },
        });
        toast.success('Spare part / material berhasil diperbarui');
      } else {
        const payload: SparePartFormValues = {
          ...form,
          stock: form.stock === '' ? 0 : Number(form.stock),
          minStock,
        };
        await createMutation.mutateAsync(payload);
        toast.success('Spare part / material berhasil ditambahkan');
      }
      onOpenChange(false);
    } catch (err: any) {
      toast.error(getErrorMessage(err, 'Gagal menyimpan spare part / material'));
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
              {canEditOpening ? (
                <>
                  <Label htmlFor="openingStock">Stok Awal</Label>
                  <Input
                    id="openingStock"
                    type="number"
                    min={0}
                    step={0.01}
                    value={openingStock}
                    disabled={detail.isLoading || detail.isError}
                    onChange={(e) => setOpeningStock(e.target.value)}
                    aria-invalid={openingInvalid || undefined}
                  />
                  <p className="mt-1 text-xs text-text-muted">
                    Stock saat ini: <span className="font-medium">{currentStock}</span>
                    {openingChanged && (
                      <>
                        {' '}→ menjadi <span className={projectedStock < 0 ? 'font-medium text-danger' : 'font-medium'}>{projectedStock}</span>
                      </>
                    )}
                    . Mutasi Stock In/Out tetap tercatat; hanya saldo awal yang dikoreksi.
                  </p>
                  {detail.isError && <p className="mt-1 text-xs text-danger">Gagal memuat saldo awal. Tutup dan buka lagi dialog ini.</p>}
                  {openingInvalid && <p className="mt-1 text-xs text-danger">Saldo awal tidak valid atau membuat stock negatif.</p>}
                </>
              ) : (
                <>
                  <Label htmlFor="stock">Stock {isEdit && <span className="font-normal text-text-muted">(saat ini)</span>}</Label>
                  <Input
                    id="stock"
                    type="number"
                    min={0}
                    step={0.01}
                    value={form.stock}
                    disabled={isEdit}
                    onChange={(e) => setForm({ ...form, stock: e.target.value })}
                  />
                  {isEdit && (
                    <p className="mt-1 text-xs text-text-muted">
                      Gunakan tombol "Stock In / Out / Adjustment" pada baris tabel, atau halaman Stock In / Stock Out, untuk mengubah stock.
                    </p>
                  )}
                </>
              )}
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
            <Label htmlFor="minStock">Min. Stock (ambang Low Stock)</Label>
            <Input
              id="minStock"
              type="number"
              min={0}
              step={0.01}
              value={form.minStock}
              onChange={(e) => setForm({ ...form, minStock: e.target.value })}
              placeholder="0"
            />
            <p className="mt-1 text-xs text-text-muted">
              Dipakai Inventory Dashboard untuk menandai item "low stock" — 0 berarti baru ditandai saat stock habis.
            </p>
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

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Batal
            </Button>
            <Button type="submit" disabled={isSaving || openingInvalid || (canEditOpening && detail.isLoading)}>
              {isSaving ? 'Menyimpan...' : 'Simpan'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
