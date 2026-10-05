import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useCreatePmPeriod, useNextPmPeriodNumber, useUpdatePmPeriod } from '../hooks/use-pm-periods';
import type { PmPeriodListItem } from '../types/pm-period.types';
import { getErrorMessage } from '@/lib/axios';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  programId: string;
  // null/undefined = mode tambah; terisi = mode edit periode tersebut.
  period?: PmPeriodListItem | null;
  suggestedDate: string; // yyyy-mm-dd, usulan dari periode terakhir + frekuensi (mode tambah)
}

const MIN_PERIOD_NUMBER = 1;
const MAX_PERIOD_NUMBER = 9999;

export function PmPeriodFormDialog({ open, onOpenChange, programId, period, suggestedDate }: Props) {
  const isEdit = Boolean(period);

  const [periodNumber, setPeriodNumber] = useState('');
  const [plannedDate, setPlannedDate] = useState(suggestedDate);
  const [remarks, setRemarks] = useState('');

  const createMutation = useCreatePmPeriod(programId);
  const updateMutation = useUpdatePmPeriod();
  const { data: nextNumber } = useNextPmPeriodNumber(programId, open && !isEdit);
  const isPending = createMutation.isPending || updateMutation.isPending;

  useEffect(() => {
    if (!open) return;
    if (period) {
      setPeriodNumber(String(period.periodNumber));
      setPlannedDate(period.plannedDate.slice(0, 10));
      setRemarks(period.remarks ?? '');
    } else {
      setPlannedDate(suggestedDate);
      setRemarks('');
    }
  }, [open, period, suggestedDate]);

  // Mode tambah: isi nomor dengan usulan otomatis dari backend begitu tersedia.
  useEffect(() => {
    if (open && !period && nextNumber !== undefined) setPeriodNumber(String(nextNumber));
  }, [open, period, nextNumber]);

  const parsedNumber = Number(periodNumber);
  const isNumberValid =
    Number.isInteger(parsedNumber) && parsedNumber >= MIN_PERIOD_NUMBER && parsedNumber <= MAX_PERIOD_NUMBER;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!isNumberValid) return;

    try {
      if (period) {
        await updateMutation.mutateAsync({
          id: period.id,
          payload: { periodNumber: parsedNumber, plannedDate, remarks: remarks || undefined },
        });
        toast.success('Periode berhasil diperbarui');
      } else {
        await createMutation.mutateAsync({ periodNumber: parsedNumber, plannedDate, remarks: remarks || undefined });
        toast.success('Periode berhasil ditambahkan');
      }
      onOpenChange(false);
    } catch (err: any) {
      toast.error(getErrorMessage(err, isEdit ? 'Gagal memperbarui periode' : 'Gagal menambah periode'));
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? `Edit Periode ${period?.periodNumber}` : 'Tambah Periode'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {!isEdit && (
            <p className="text-sm text-text-muted">
              Baris eksekusi akan dibuat otomatis untuk setiap equipment dan checklist item yang terdaftar pada program ini
              saat ini.
            </p>
          )}
          <div>
            <Label htmlFor="periodNumber">Nomor Periode</Label>
            <Input
              id="periodNumber"
              type="number"
              inputMode="numeric"
              min={MIN_PERIOD_NUMBER}
              max={MAX_PERIOD_NUMBER}
              step={1}
              value={periodNumber}
              onChange={(e) => setPeriodNumber(e.target.value)}
              required
            />
            <p className="mt-1 text-xs text-text-muted">
              {isEdit
                ? 'Harus unik di program ini. Nomor milik periode lain (termasuk yang sudah dihapus) tidak bisa dipakai.'
                : 'Terisi otomatis dengan nomor berikutnya — boleh diubah, misalnya untuk melanjutkan penomoran dari data lama.'}
            </p>
          </div>
          <div>
            <Label htmlFor="plannedDate">Tanggal Rencana</Label>
            <Input
              id="plannedDate"
              type="date"
              value={plannedDate}
              onChange={(e) => setPlannedDate(e.target.value)}
              required
            />
          </div>
          <div>
            <Label htmlFor="remarks">Remarks</Label>
            <Input id="remarks" value={remarks} onChange={(e) => setRemarks(e.target.value)} maxLength={500} />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Batal
            </Button>
            <Button type="submit" disabled={isPending || !isNumberValid}>
              {isPending ? 'Menyimpan...' : 'Simpan'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
