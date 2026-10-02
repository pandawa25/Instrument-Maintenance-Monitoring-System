import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { useCreateStandaloneMovement, useSparePartsLookup } from '../hooks/use-spare-parts';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** RESTOCK = Stock In, STOCK_OUT = Stock Out — menentukan judul, validasi, dan endpoint. */
  type: 'RESTOCK' | 'STOCK_OUT';
}

const LABEL: Record<Props['type'], { title: string; qtyLabel: string; cta: string }> = {
  RESTOCK: { title: 'Tambah Stock In', qtyLabel: 'Jumlah Masuk', cta: 'Catat Stock In' },
  STOCK_OUT: { title: 'Tambah Stock Out', qtyLabel: 'Jumlah Keluar', cta: 'Catat Stock Out' },
};

/**
 * Dialog create Stock In / Stock Out lintas-part — beda dengan StockMovementDialog
 * (yang dibuka dari satu baris spare part spesifik di Master Spare Part): di sini
 * user memilih spare part-nya dulu, dipakai di halaman Stock In & Stock Out.
 */
export function StockMovementFormDialog({ open, onOpenChange, type }: Props) {
  const [sparePartId, setSparePartId] = useState('');
  const [quantity, setQuantity] = useState('');
  const [notes, setNotes] = useState('');

  const { data: spareParts } = useSparePartsLookup();
  const createMutation = useCreateStandaloneMovement(type);
  const selected = spareParts?.find((sp) => sp.id === sparePartId);
  const label = LABEL[type];

  useEffect(() => {
    if (open) {
      setSparePartId('');
      setQuantity('');
      setNotes('');
    }
  }, [open]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!sparePartId) {
      toast.error('Pilih spare part / material terlebih dahulu');
      return;
    }
    const qty = Number(quantity);
    if (!qty || qty <= 0) {
      toast.error('Jumlah harus lebih dari 0');
      return;
    }
    if (type === 'STOCK_OUT' && selected && qty > selected.stock) {
      toast.error(`Stock tidak cukup — tersedia ${selected.stock} ${selected.unit}`);
      return;
    }

    try {
      await createMutation.mutateAsync({ sparePartId, quantityDelta: qty, notes: notes || undefined });
      toast.success(`${type === 'RESTOCK' ? 'Stock In' : 'Stock Out'} berhasil dicatat`);
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? `Gagal mencatat ${type === 'RESTOCK' ? 'Stock In' : 'Stock Out'}`);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{label.title}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="sparePartId">Spare Part / Material</Label>
            <Select id="sparePartId" value={sparePartId} onChange={(e) => setSparePartId(e.target.value)} required>
              <option value="" disabled>
                Pilih spare part...
              </option>
              {spareParts?.map((sp) => (
                <option key={sp.id} value={sp.id}>
                  {sp.kimap} — {sp.name} (stock: {sp.stock} {sp.unit})
                </option>
              ))}
            </Select>
            {selected && (
              <p className="mt-1 text-xs text-text-muted">
                Stock saat ini: {selected.stock} {selected.unit}
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="quantity">{label.qtyLabel}</Label>
              <Input
                id="quantity"
                type="number"
                min={1}
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                placeholder="10"
                required
              />
            </div>
            <div>
              <Label htmlFor="notes">Catatan</Label>
              <Input
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder={type === 'RESTOCK' ? 'mis. Restock dari PO-2026-001' : 'mis. Dipakai di lapangan — Area PU-01'}
                maxLength={255}
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Batal
            </Button>
            <Button type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending ? 'Menyimpan...' : label.cta}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
