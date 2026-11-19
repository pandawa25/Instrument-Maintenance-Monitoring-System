import { useState } from 'react';
import { MapPinned, Plus } from 'lucide-react';
import { useQueryParamsState } from '@/lib/use-query-params-state';
import { useCrudDialogState, useCrudDelete } from '@/lib/use-crud-dialog-state';
import { useBulkSelection } from '@/lib/use-bulk-selection';
import { useBulkAction } from '@/lib/use-bulk-action';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Select } from '@/components/ui/select';
import { SearchInput } from '@/components/shared/search-input';
import { Pagination } from '@/components/shared/pagination';
import { ConfirmDialog } from '@/components/shared/confirm-dialog';
import { PageHeader } from '@/components/shared/page-header';
import { BulkActionBar } from '@/components/shared/bulk-action-bar';
import { useAreas, useDeleteArea, useUpdateArea } from '../hooks/use-areas';
import { AreaTable } from '../components/area-table';
import { AreaFormDialog } from '../components/area-form-dialog';
import { AreaDetailDialog } from '../components/area-detail-dialog';
import { usePermission } from '@/store/auth.store';
import type { Area, AreaQueryParams } from '../types/area.types';

const DEFAULT_PARAMS: AreaQueryParams = { page: 1, limit: 20, search: '', status: '' };

export function AreaListPage() {
  const canCreate = usePermission('AREA', 'create');
  const canEdit = usePermission('AREA', 'edit');

  const [params, setParams] = useQueryParamsState<AreaQueryParams>(DEFAULT_PARAMS);
  const dialog = useCrudDialogState<Area>();
  const [bulkDeleteConfirmOpen, setBulkDeleteConfirmOpen] = useState(false);

  const { data, isLoading } = useAreas(params);
  const areaList = data?.data ?? [];
  const deleteMutation = useDeleteArea();
  const updateMutation = useUpdateArea();
  const { deletingItem, setDeletingItem, confirmDelete } = useCrudDelete<Area>({
    deleteMutation,
    getId: (area) => area.id,
    successMessage: (area) => `Area "${area.areaName}" berhasil dihapus`,
    errorMessage: 'Gagal menghapus area',
  });

  const selection = useBulkSelection<Area>(areaList, (area) => area.id, params);

  const bulkDelete = useBulkAction({
    action: (id) => deleteMutation.mutateAsync(id),
    successMessage: (count) => `${count} area berhasil dihapus`,
    failureMessage: (succeeded, failed) =>
      succeeded === 0
        ? `Gagal menghapus ${failed} area — mungkin masih ada equipment aktif`
        : `${succeeded} area berhasil dihapus, ${failed} gagal (mungkin masih ada equipment aktif)`,
  });

  const bulkSetActive = useBulkAction({
    action: (id) => updateMutation.mutateAsync({ id, payload: { status: 'ACTIVE' } }),
    successMessage: (count) => `${count} area berhasil diaktifkan`,
    failureMessage: (succeeded, failed) => `${succeeded} berhasil diaktifkan, ${failed} gagal diubah`,
  });

  const bulkSetInactive = useBulkAction({
    action: (id) => updateMutation.mutateAsync({ id, payload: { status: 'INACTIVE' } }),
    successMessage: (count) => `${count} area berhasil dinonaktifkan`,
    failureMessage: (succeeded, failed) => `${succeeded} berhasil dinonaktifkan, ${failed} gagal diubah`,
  });

  async function handleBulkDelete() {
    await bulkDelete.run(Array.from(selection.selectedIds));
    setBulkDeleteConfirmOpen(false);
    selection.clear();
  }

  async function handleBulkSetStatus(status: 'ACTIVE' | 'INACTIVE') {
    await (status === 'ACTIVE' ? bulkSetActive : bulkSetInactive).run(Array.from(selection.selectedIds));
    selection.clear();
  }

  return (
    <div className="space-y-4">
      <PageHeader
        icon={MapPinned}
        title="Master Area"
        description="Kelola area/unit proses pada fasilitas."
        action={
          canCreate && (
            <Button onClick={dialog.openCreate}>
              <Plus className="h-4 w-4" />
              Tambah Area
            </Button>
          )
        }
      />

      <Card>
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

        {canEdit && (
          <BulkActionBar
            count={selection.selectedCount}
            itemLabel="area"
            onClear={selection.clear}
            onDelete={() => setBulkDeleteConfirmOpen(true)}
            isDeleting={bulkDelete.isRunning}
            statusActions={[
              { label: 'Set Active', onClick: () => handleBulkSetStatus('ACTIVE'), disabled: bulkSetActive.isRunning },
              { label: 'Set Inactive', onClick: () => handleBulkSetStatus('INACTIVE'), disabled: bulkSetInactive.isRunning },
            ]}
          />
        )}

        <div className="overflow-x-auto">
          <AreaTable
            areas={areaList}
            isLoading={isLoading}
            canEdit={canEdit}
            onEdit={dialog.openEdit}
            onDelete={setDeletingItem}
            onView={dialog.openView}
            selectedIds={selection.selectedIds}
            onToggleOne={selection.toggleOne}
            onToggleAll={selection.toggleAll}
          />
        </div>

        {data?.meta && (
          <Pagination meta={data.meta} onPageChange={(page) => setParams((p) => ({ ...p, page }))} />
        )}
      </Card>

      <AreaFormDialog open={dialog.formOpen} onOpenChange={dialog.setFormOpen} area={dialog.editingItem} />

      <AreaDetailDialog open={Boolean(dialog.viewingItem)} onOpenChange={(open) => !open && dialog.closeView()} area={dialog.viewingItem} />

      <ConfirmDialog
        open={bulkDeleteConfirmOpen}
        onOpenChange={setBulkDeleteConfirmOpen}
        title="Hapus Area Terpilih"
        description={`${selection.selectedCount} area akan dihapus. Area yang masih memiliki equipment aktif tidak akan terhapus dan akan dilaporkan sebagai gagal.`}
        loading={bulkDelete.isRunning}
        onConfirm={handleBulkDelete}
      />

      <ConfirmDialog
        open={Boolean(deletingItem)}
        onOpenChange={(open) => !open && setDeletingItem(null)}
        title="Hapus Area"
        description={`Area "${deletingItem?.areaName}" akan dihapus. Aksi ini ditolak jika area masih memiliki equipment aktif.`}
        loading={deleteMutation.isPending}
        onConfirm={confirmDelete}
      />
    </div>
  );
}
