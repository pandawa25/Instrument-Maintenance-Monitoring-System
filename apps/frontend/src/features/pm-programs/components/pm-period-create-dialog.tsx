import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useCreatePmPeriod } from '../hooks/use-pm-periods';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  programId: string;
  suggestedDate: string; // yyyy-mm-dd, computed by caller from last period + frequency
  nextPeriodNumber: number;
}

export function PmPeriodCreateDialog({ open, onOpenChange, programId, suggestedDate, nextPeriodNumber }: Props) {
  const [plannedDate, setPlannedDate] = useState(suggestedDate);
  const [remarks, setRemarks] = useState('');
  const [error, setError] = useState<string | null>(null);

  const createMutation = useCreatePmPeriod(programId);

  useEffect(() => {
    if (open) {
      setPlannedDate(suggestedDate);
      setRemarks('');
      setError(null);
    }
  }, [open, suggestedDate]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await createMutation.mutateAsync({ plannedDate, remarks: remarks || undefined });
      onOpenChange(false);
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'Gagal menambah periode');
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Tambah Periode {nextPeriodNumber}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <p className="text-sm text-text-muted">
            Baris eksekusi akan dibuat otomatis untuk setiap equipment dan checklist item yang terdaftar pada program ini saat ini.
          </p>
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

          {error && <p className="text-sm text-danger">{error}</p>}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Batal
            </Button>
            <Button type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending ? 'Menyimpan...' : 'Simpan'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
