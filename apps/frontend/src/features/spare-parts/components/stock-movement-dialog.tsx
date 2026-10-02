import { useState } from 'react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Pagination } from '@/components/shared/pagination';
import { StatusBadge } from '@/components/shared/status-badge';
import { LoadingState } from '@/components/shared/loading-state';
import { EmptyState } from '@/components/shared/empty-state';
import { useCreateStockMovement, useStockMovements } from '../hooks/use-spare-parts';
import type { CreateStockMovementPayload, ManualStockMovementType, SparePart } from '../types/spare-part.types';

const EMPTY_FORM: CreateStockMovementPayload = { type: 'RESTOCK', quantityDelta: 0, notes: '' };

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sparePart: SparePart | null;
  canEdit: boolean;
  onSparePartUpdated?: (sparePart: SparePart) => void;
}

// Dialog gabungan: form Restock/Adjustment (Admin only) + riwayat pergerakan
// stock (ledger) — dibuka dari tombol "Stock In / Adjustment" pada list/detail.
export function StockMovementDialog({ open, onOpenChange, sparePart, canEdit, onSparePartUpdated }: Props) {
  const [page, setPage] = useState(1);
  const [form, setForm] = useState<CreateStockMovementPayload>(EMPTY_FORM);

  const { data, isLoading } = useStockMovements(sparePart?.id, { page, limit: 10 });
  const createMutation = useCreateStockMovement();

  if (!sparePart) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const qty = Number(form.quantityDelta);
    if (!qty) {
      toast.error('Jumlah tidak boleh 0');
      return;
    }
    if (form.type === 'RESTOCK' && qty <= 0) {
      toast.error('Stock In (RESTOCK) harus bernilai positif');
      return;
    }
    if (form.type === 'STOCK_OUT' && qty <= 0) {
      toast.error('Stock Out harus bernilai positif (jumlah yang keluar)');
      return;
    }

    try {
      const updated = await createMutation.mutateAsync({
        sparePartId: sparePart!.id,
        payload: { ...form, quantityDelta: qty },
      });
      onSparePartUpdated?.(updated);
      setForm(EMPTY_FORM);
      setPage(1);
      toast.success('Pergerakan stock berhasil dicatat');
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'Gagal mencatat pergerakan stock');
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Stock Movement — {sparePart.kimap}</DialogTitle>
        </DialogHeader>

        <div className="flex items-center justify-between rounded-lg border border-border bg-surface-2 px-4 py-3">
          <span className="text-sm text-text-muted">Stock saat ini</span>
          <span className="text-lg font-semibold text-text">
            {sparePart.stock} {sparePart.unit}
          </span>
        </div>

        {canEdit && (
          <form onSubmit={handleSubmit} className="space-y-3 rounded-lg border border-border p-4">
            <p className="text-sm font-medium text-text">Stock In / Stock Out / Adjustment Manual</p>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label htmlFor="movement-type">Tipe</Label>
                <Select
                  id="movement-type"
                  value={form.type}
                  onChange={(e) => setForm({ ...form, type: e.target.value as ManualStockMovementType })}
                >
                  <option value="RESTOCK">Stock In (+)</option>
                  <option value="STOCK_OUT">Stock Out (-)</option>
                  <option value="ADJUSTMENT">Adjustment (+/-)</option>
                </Select>
              </div>
              <div>
                <Label htmlFor="movement-qty">
                  Jumlah {form.type === 'ADJUSTMENT' ? '(+/-)' : form.type === 'STOCK_OUT' ? '(yang keluar)' : ''}
                </Label>
                <Input
                  id="movement-qty"
                  type="number"
                  value={form.quantityDelta || ''}
                  onChange={(e) => setForm({ ...form, quantityDelta: Number(e.target.value) })}
                  placeholder={form.type === 'ADJUSTMENT' ? '-2 atau 5' : '10'}
                />
              </div>
              <div>
                <Label htmlFor="movement-notes">Catatan</Label>
                <Input
                  id="movement-notes"
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  placeholder="Opsional"
                  maxLength={255}
                />
              </div>
            </div>

            <div className="flex justify-end">
              <Button type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending ? 'Menyimpan...' : 'Catat Pergerakan'}
              </Button>
            </div>
          </form>
        )}

        <div className="rounded-lg border border-border">
          <div className="border-b border-border px-4 py-2 text-sm font-medium text-text">Riwayat Pergerakan Stock</div>
          <div className="max-h-72 overflow-y-auto">
            {isLoading ? (
              <LoadingState />
            ) : !data?.data.length ? (
              <EmptyState message="Belum ada pergerakan stock." />
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-surface-2 text-left text-xs uppercase tracking-wide text-text-muted">
                    <th className="px-4 py-2 font-medium">Tanggal</th>
                    <th className="px-4 py-2 font-medium">Tipe</th>
                    <th className="px-4 py-2 font-medium text-center">Delta</th>
                    <th className="px-4 py-2 font-medium text-center">Saldo</th>
                    <th className="px-4 py-2 font-medium">Dibuat Oleh</th>
                    <th className="px-4 py-2 font-medium">Catatan</th>
                  </tr>
                </thead>
                <tbody>
                  {data.data.map((m) => (
                    <tr key={m.id} className="border-b border-border last:border-0">
                      <td className="px-4 py-2 text-text-muted">{new Date(m.createdAt).toLocaleString('id-ID')}</td>
                      <td className="px-4 py-2">
                        <StatusBadge value={m.type} />
                      </td>
                      <td className={`px-4 py-2 text-center font-medium ${m.quantityDelta > 0 ? 'text-success' : 'text-danger'}`}>
                        {m.quantityDelta > 0 ? `+${m.quantityDelta}` : m.quantityDelta}
                      </td>
                      <td className="px-4 py-2 text-center text-text">{m.balanceAfter}</td>
                      <td className="px-4 py-2 text-text-muted">{m.createdBy?.fullName ?? '—'}</td>
                      <td className="px-4 py-2 text-text-muted">{m.notes ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
          {data?.meta && data.meta.total > 0 && <Pagination meta={data.meta} onPageChange={setPage} />}
        </div>
      </DialogContent>
    </Dialog>
  );
}
