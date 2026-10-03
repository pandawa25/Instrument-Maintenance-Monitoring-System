import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { MaintenanceForm } from './maintenance-form';
import type { Maintenance } from '../types/maintenance.types';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  maintenance?: Maintenance | null; // null/undefined = mode create
}

// Wrapper Dialog tipis di atas MaintenanceForm — dipakai list page hanya untuk
// "Buat e-SPK" (create). Mode edit sekarang di MaintenanceDetailPage (halaman penuh),
// bukan di sini lagi — lihat roadmap Risk register "redesign halaman detail & edit".
export function MaintenanceFormDialog({ open, onOpenChange, maintenance }: Props) {
  const isEdit = Boolean(maintenance);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Corrective Maintenance' : 'Tambah Corrective Maintenance'}</DialogTitle>
        </DialogHeader>
        <MaintenanceForm
          maintenance={maintenance}
          onSuccess={() => onOpenChange(false)}
          onCancel={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  );
}
