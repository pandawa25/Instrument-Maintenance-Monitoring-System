import { useState } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { SearchInput } from '@/components/shared/search-input';
import { Pagination } from '@/components/shared/pagination';
import { ConfirmDialog } from '@/components/shared/confirm-dialog';
import { useMaintenanceList, useDeleteMaintenance } from '../hooks/use-maintenance';
import { useAreasLookup, useInstrumentsLookup } from '../hooks/use-maintenance-lookups';
import { MaintenanceTable } from '../components/maintenance-table';
import { MaintenanceFormDialog } from '../components/maintenance-form-dialog';
import { MaintenanceDetailDialog } from '../components/maintenance-detail-dialog';
import { useAuthStore } from '@/store/auth.store';
import type { Maintenance, MaintenanceQueryParams } from '../types/maintenance.types';

const DEFAULT_PARAMS: MaintenanceQueryParams = {
  page: 1,
  limit: 20,
  search: '',
  areaId: '',
  instrumentId: '',
  status: '',
  dateFrom: '',
  dateTo: '',
};

export function MaintenanceListPage() {
  const role = useAuthStore((s) => s.user?.role);
  const canEdit = role === 'Admin';

  const [params, setParams] = useState<MaintenanceQueryParams>(DEFAULT_PARAMS);
  const [formOpen, setFormOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Maintenance | null>(null);
  const [viewingItem, setViewingItem] = useState<Maintenance | null>(null);
  const [deletingItem, setDeletingItem] = useState<Maintenance | null>(null);

  const { data, isLoading } = useMaintenanceList(params);
  const { data: areas } = useAreasLookup();
  const { data: instruments } = useInstrumentsLookup();
  const deleteMutation = useDeleteMaintenance();

  function openCreate() {
    setEditingItem(null);
    setFormOpen(true);
  }

  function openEdit(item: Maintenance) {
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
          <h2 className="text-lg font-semibold text-text">Corrective Maintenance</h2>
          <p className="text-sm text-text-muted">Riwayat perbaikan dan gangguan instrument di seluruh area.</p>
        </div>
        {canEdit && (
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4" />
            Tambah Maintenance
          </Button>
        )}
      </div>

      <div className="rounded-xl border border-border/70 bg-surface shadow-sm">
        <div className="flex flex-wrap items-end gap-3 border-b border-border p-4">
          <SearchInput
            value={params.search ?? ''}
            onChange={(search) => setParams((p) => ({ ...p, search, page: 1 }))}
            placeholder="Cari tag number / deskripsi masalah..."
          />

          <div>
            <label className="mb-1 block text-xs font-medium text-text-muted">Dari Tanggal</label>
            <Input
              type="date"
              className="w-40"
              value={params.dateFrom ?? ''}
              onChange={(e) => setParams((p) => ({ ...p, dateFrom: e.target.value, page: 1 }))}
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-text-muted">Sampai Tanggal</label>
            <Input
              type="date"
              className="w-40"
              value={params.dateTo ?? ''}
              onChange={(e) => setParams((p) => ({ ...p, dateTo: e.target.value, page: 1 }))}
            />
          </div>

          <Select
            className="w-44"
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
            className="w-52"
            value={params.instrumentId}
            onChange={(e) => setParams((p) => ({ ...p, instrumentId: e.target.value, page: 1 }))}
          >
            <option value="">Semua Instrument</option>
            {instruments?.map((instrument) => (
              <option key={instrument.id} value={instrument.id}>
                {instrument.tagNumber}
              </option>
            ))}
          </Select>

          <Select
            className="w-40"
            value={params.status}
            onChange={(e) =>
              setParams((p) => ({ ...p, status: e.target.value as MaintenanceQueryParams['status'], page: 1 }))
            }
          >
            <option value="">Semua Status</option>
            <option value="OPEN">Open</option>
            <option value="IN_PROGRESS">In Progress</option>
            <option value="COMPLETED">Completed</option>
          </Select>
        </div>

        <div className="overflow-x-auto">
          <MaintenanceTable
            items={data?.data ?? []}
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

      <MaintenanceFormDialog open={formOpen} onOpenChange={setFormOpen} maintenance={editingItem} />

      <MaintenanceDetailDialog
        open={Boolean(viewingItem)}
        onOpenChange={(open) => !open && setViewingItem(null)}
        maintenance={viewingItem}
      />

      <ConfirmDialog
        open={Boolean(deletingItem)}
        onOpenChange={(open) => !open && setDeletingItem(null)}
        title="Hapus Data Maintenance"
        description={`Data corrective maintenance untuk instrument "${deletingItem?.instrument.tagNumber}" pada tanggal ${
          deletingItem ? new Date(deletingItem.maintenanceDate).toLocaleDateString('id-ID') : ''
        } akan dihapus.`}
        loading={deleteMutation.isPending}
        onConfirm={confirmDelete}
      />
    </div>
  );
}
