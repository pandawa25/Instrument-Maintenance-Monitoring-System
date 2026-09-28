import { useState } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { SearchInput } from '@/components/shared/search-input';
import { Pagination } from '@/components/shared/pagination';
import { ConfirmDialog } from '@/components/shared/confirm-dialog';
import { useEquipmentList, useDeleteEquipment } from '../hooks/use-equipment';
import { useAreasLookup, useInstrumentNames } from '../hooks/use-equipment-lookups';
import { EquipmentTable } from '../components/equipment-table';
import { EquipmentFormDialog } from '../components/equipment-form-dialog';
import { EquipmentDetailDialog } from '../components/equipment-detail-dialog';
import { useAuthStore } from '@/store/auth.store';
import type { Equipment, EquipmentQueryParams } from '../types/equipment.types';

const DEFAULT_PARAMS: EquipmentQueryParams = {
  page: 1,
  limit: 20,
  search: '',
  areaId: '',
  instrumentNameId: '',
  status: '',
};

export function EquipmentListPage() {
  const role = useAuthStore((s) => s.user?.role);
  const canEdit = role === 'Admin';

  const [params, setParams] = useState<EquipmentQueryParams>(DEFAULT_PARAMS);
  const [formOpen, setFormOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Equipment | null>(null);
  const [viewingItem, setViewingItem] = useState<Equipment | null>(null);
  const [deletingItem, setDeletingItem] = useState<Equipment | null>(null);

  const { data, isLoading } = useEquipmentList(params);
  const { data: areas } = useAreasLookup();
  const { data: instrumentNames } = useInstrumentNames();
  const deleteMutation = useDeleteEquipment();

  function openCreate() {
    setEditingItem(null);
    setFormOpen(true);
  }

  function openEdit(item: Equipment) {
    setEditingItem(item);
    setFormOpen(true);
  }

  async function confirmDelete() {
    if (!deletingItem) return;
    await deleteMutation.mutateAsync(deletingItem.id);
    setDeletingItem(null);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-text">Master Equipment</h2>
          <p className="text-sm text-text-muted">Kelola data equipment/instrument pada seluruh area.</p>
        </div>
        {canEdit && (
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4" />
            Tambah Equipment
          </Button>
        )}
      </div>

      <div className="rounded-xl border border-border/70 bg-surface shadow-sm">
        <div className="flex flex-wrap items-center gap-3 border-b border-border p-4">
          <SearchInput
            value={params.search ?? ''}
            onChange={(search) => setParams((p) => ({ ...p, search, page: 1 }))}
            placeholder="Cari tag number / service..."
          />
          <Select
            className="w-48"
            value={params.areaId}
            onChange={(e) => setParams((p) => ({ ...p, areaId: e.target.value, page: 1 }))}
          >
            <option value="">Semua Area</option>
            {areas?.map((area) => (
              <option key={area.id} value={area.id}>
                {area.areaCode}
              </option>
            ))}
          </Select>
          <Select
            className="w-48"
            value={params.instrumentNameId}
            onChange={(e) => setParams((p) => ({ ...p, instrumentNameId: e.target.value, page: 1 }))}
          >
            <option value="">Semua Instrument Name</option>
            {instrumentNames?.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </Select>
          <Select
            className="w-40"
            value={params.status}
            onChange={(e) =>
              setParams((p) => ({ ...p, status: e.target.value as EquipmentQueryParams['status'], page: 1 }))
            }
          >
            <option value="">Semua Status</option>
            <option value="ACTIVE">Active</option>
            <option value="STANDBY">Standby</option>
            <option value="OUT_OF_SERVICE">Out Of Service</option>
          </Select>
        </div>

        <div className="overflow-x-auto">
          <EquipmentTable
            equipment={data?.data ?? []}
            isLoading={isLoading}
            canEdit={canEdit}
            onEdit={openEdit}
            onDelete={setDeletingItem}
            onView={setViewingItem}
          />
        </div>

        {data?.meta && (
          <Pagination meta={data.meta} onPageChange={(page) => setParams((p) => ({ ...p, page }))} />
        )}
      </div>

      <EquipmentFormDialog open={formOpen} onOpenChange={setFormOpen} equipment={editingItem} />

      <EquipmentDetailDialog
        open={Boolean(viewingItem)}
        onOpenChange={(open) => !open && setViewingItem(null)}
        equipment={viewingItem}
      />

      <ConfirmDialog
        open={Boolean(deletingItem)}
        onOpenChange={(open) => !open && setDeletingItem(null)}
        title="Hapus Equipment"
        description={`Equipment "${deletingItem?.tagNumber}" akan dihapus. Aksi ini ditolak jika equipment masih memiliki riwayat corrective maintenance.`}
        loading={deleteMutation.isPending}
        onConfirm={confirmDelete}
      />
    </div>
  );
}
