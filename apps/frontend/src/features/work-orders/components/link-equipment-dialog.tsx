import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { SearchableSelect } from '@/components/shared/searchable-select';
import { fetchEquipmentForDropdown } from '../api/equipment-lookup.api';
import { useRelinkWorkOrderEquipment } from '../hooks/use-work-orders';
import type { WorkOrder } from '../types/work-order.types';
import { getErrorMessage } from '@/lib/axios';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workOrder: WorkOrder;
}

// Satu-satunya field ERP yang boleh dikoreksi manual (lihat WorkOrdersController) — dipakai
// terutama untuk baris "Antrian Belum Terhubung" (matching tag otomatis gagal saat import).
export function LinkEquipmentDialog({ open, onOpenChange, workOrder }: Props) {
  const [equipmentId, setEquipmentId] = useState(workOrder.equipmentId ?? '');
  const { data: equipmentOptions } = useQuery({
    queryKey: ['equipment', 'dropdown'],
    queryFn: fetchEquipmentForDropdown,
    staleTime: 60_000,
  });
  const relinkMutation = useRelinkWorkOrderEquipment();

  async function handleSave() {
    try {
      await relinkMutation.mutateAsync({ id: workOrder.id, equipmentId: equipmentId || null });
      toast.success(equipmentId ? 'Equipment berhasil dihubungkan' : 'Link equipment dilepas');
      onOpenChange(false);
    } catch (err: any) {
      toast.error(getErrorMessage(err, 'Gagal menyimpan link equipment'));
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Hubungkan Equipment — {workOrder.orderNo}</DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          {workOrder.equipmentTagRaw && (
            <p className="text-sm text-text-muted">
              Kode mentah dari ERP: <span className="font-medium text-text">{workOrder.equipmentTagRaw}</span> — tidak
              ditemukan match otomatis di Master Equipment, pilih manual di bawah.
            </p>
          )}
          <SearchableSelect
            id="link-equipment"
            value={equipmentId}
            onChange={setEquipmentId}
            options={(equipmentOptions ?? []).map((item) => ({
              value: item.id,
              label: item.tagNumber,
              sublabel: `${item.area.areaCode} — ${item.service}`,
            }))}
            placeholder="Pilih equipment..."
            searchPlaceholder="Cari tag number..."
          />
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Batal
          </Button>
          <Button type="button" onClick={handleSave} disabled={relinkMutation.isPending}>
            {relinkMutation.isPending ? 'Menyimpan...' : 'Simpan'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
