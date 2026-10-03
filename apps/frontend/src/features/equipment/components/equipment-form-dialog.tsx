import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { EquipmentForm } from './equipment-form';
import type { Equipment } from '../types/equipment.types';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  equipment?: Equipment | null; // null/undefined = mode create
}

// Wrapper Dialog tipis di atas EquipmentForm — dipakai list page hanya untuk "Tambah
// Equipment" (create). Mode edit sekarang di EquipmentDetailPage (halaman penuh), bukan
// di sini lagi — lihat roadmap Risk register "redesign halaman detail & edit".
export function EquipmentFormDialog({ open, onOpenChange, equipment }: Props) {
  const isEdit = Boolean(equipment);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Equipment' : 'Tambah Equipment'}</DialogTitle>
        </DialogHeader>
        <EquipmentForm
          equipment={equipment}
          onSuccess={() => onOpenChange(false)}
          onCancel={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  );
}
