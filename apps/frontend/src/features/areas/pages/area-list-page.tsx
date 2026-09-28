import { useState } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { SearchInput } from '@/components/shared/search-input';
import { Pagination } from '@/components/shared/pagination';
import { ConfirmDialog } from '@/components/shared/confirm-dialog';
import { useAreas, useDeleteArea } from '../hooks/use-areas';
import { AreaTable } from '../components/area-table';
import { AreaFormDialog } from '../components/area-form-dialog';
import { AreaDetailDialog } from '../components/area-detail-dialog';
import { useAuthStore } from '@/store/auth.store';
import type { Area, AreaQueryParams } from '../types/area.types';

const DEFAULT_PARAMS: AreaQueryParams = { page: 1, limit: 20, search: '', status: '' };

export function AreaListPage() {
  const role = useAuthStore((s) => s.user?.role);
  const canEdit = role === 'Admin';

  const [params, setParams] = useState<AreaQueryParams>(DEFAULT_PARAMS);
  const [formOpen, setFormOpen] = useState(false);
  const [editingArea, setEditingArea] = useState<Area | null>(null);
  const [viewingArea, setViewingArea] = useState<Area | null>(null);
  const [deletingArea, setDeletingArea] = useState<Area | null>(null);

  const { data, isLoading } = useAreas(params);
  const deleteMutation = useDeleteArea();

  function openCreate() {
    setEditingArea(null);
    setFormOpen(true);
  }

  function openEdit(area: Area) {
    setEditingArea(area);
    setFormOpen(true);
  }

  async function confirmDelete() {
    if (!deletingArea) return;
    await deleteMutation.mutateAsync(deletingArea.id);
    setDeletingArea(null);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-text">Master Area</h2>
          <p className="text-sm text-text-muted">Kelola area/unit proses pada fasilitas.</p>
        </div>
        {canEdit && (
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4" />
            Tambah Area
          </Button>
        )}
      </div>

      <div className="rounded-xl border border-border/70 bg-surface shadow-sm">
        <div className="flex flex-wrap items-center gap-3 border-b border-border p-4">
          <SearchInput
            value={params.search ?? ''}
            onChange={(search) => setParams((p) => ({ ...p, search, page: 1 }))}
            placeholder="Cari area code / nama..."
          />
          <Select
            className="w-40"
            value={params.status}
            onChange={(e) => setParams((p) => ({ ...p, status: e.target.value as AreaQueryParams['status'], page: 1 }))}
          >
            <option value="">Semua Status</option>
            <option value="ACTIVE">Active</option>
            <option value="INACTIVE">Inactive</option>
          </Select>
        </div>

        <div className="overflow-x-auto">
          <AreaTable
            areas={data?.data ?? []}
            isLoading={isLoading}
            canEdit={canEdit}
            onEdit={openEdit}
            onDelete={setDeletingArea}
            onView={setViewingArea}
          />
        </div>

        {data?.meta && (
          <Pagination meta={data.meta} onPageChange={(page) => setParams((p) => ({ ...p, page }))} />
        )}
      </div>

      <AreaFormDialog open={formOpen} onOpenChange={setFormOpen} area={editingArea} />

      <AreaDetailDialog open={Boolean(viewingArea)} onOpenChange={(open) => !open && setViewingArea(null)} area={viewingArea} />

      <ConfirmDialog
        open={Boolean(deletingArea)}
        onOpenChange={(open) => !open && setDeletingArea(null)}
        title="Hapus Area"
        description={`Area "${deletingArea?.areaName}" akan dihapus. Aksi ini ditolak jika area masih memiliki equipment aktif.`}
        loading={deleteMutation.isPending}
        onConfirm={confirmDelete}
      />
    </div>
  );
}
