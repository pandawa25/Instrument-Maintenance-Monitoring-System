import { useState } from 'react';
import { ListChecks, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { SearchInput } from '@/components/shared/search-input';
import { Pagination } from '@/components/shared/pagination';
import { ConfirmDialog } from '@/components/shared/confirm-dialog';
import { PageHeader } from '@/components/shared/page-header';
import { BulkActionBar } from '@/components/shared/bulk-action-bar';
import { usePmActivityTypeList, useDeletePmActivityType } from '../hooks/use-pm-activity-types';
import { PmActivityTypeTable } from '../components/pm-activity-type-table';
import { PmActivityTypeFormDialog } from '../components/pm-activity-type-form-dialog';
import { PmActivityTypeDetailDialog } from '../components/pm-activity-type-detail-dialog';
import { usePermission } from '@/store/auth.store';
import type { PmActivityType, PmActivityTypeQueryParams } from '../types/pm-activity-type.types';
import { useQueryParamsState } from '@/lib/use-query-params-state';
import { useCrudDialogState, useCrudDelete } from '@/lib/use-crud-dialog-state';
import { useBulkSelection } from '@/lib/use-bulk-selection';
import { useBulkAction } from '@/lib/use-bulk-action';

const DEFAULT_PARAMS: PmActivityTypeQueryParams = { page: 1, limit: 20, search: '' };

export function PmActivityTypeListPage() {
  const canCreate = usePermission('PM_ACTIVITY_TYPE', 'create');
  const canEdit = usePermission('PM_ACTIVITY_TYPE', 'edit');

  const [params, setParams] = useQueryParamsState<PmActivityTypeQueryParams>(DEFAULT_PARAMS);
  const dialog = useCrudDialogState<PmActivityType>();
  const [bulkDeleteConfirmOpen, setBulkDeleteConfirmOpen] = useState(false);

  const { data, isLoading } = usePmActivityTypeList(params);
  const itemList = data?.data ?? [];
  const deleteMutation = useDeletePmActivityType();
  const { deletingItem, setDeletingItem, confirmDelete } = useCrudDelete<PmActivityType>({
    deleteMutation,
    getId: (item) => item.id,
    successMessage: (item) => `Activity type "${item.name}" berhasil dihapus`,
    errorMessage: 'Gagal menghapus activity type',
  });

  const selection = useBulkSelection<PmActivityType>(itemList, (item) => item.id, params);

  const bulkDelete = useBulkAction({
    action: (id) => deleteMutation.mutateAsync(id),
    successMessage: (count) => `${count} activity type berhasil dihapus`,
    failureMessage: (succeeded, failed) =>
      succeeded === 0
        ? `Gagal menghapus ${failed} activity type — mungkin masih dipakai checklist item`
        : `${succeeded} berhasil dihapus, ${failed} gagal (mungkin masih dipakai checklist item)`,
  });

  async function handleBulkDelete() {
    await bulkDelete.run(Array.from(selection.selectedIds));
    setBulkDeleteConfirmOpen(false);
    selection.clear();
  }

  return (
    <div className="space-y-4">
      <PageHeader
        icon={ListChecks}
        title="Master PM Activity Type"
        description="Kelola jenis aktifitas PM (Cleaning, Calibration, dst) untuk checklist PM Program."
        action={
          canCreate && (
            <Button onClick={dialog.openCreate}>
              <Plus className="h-4 w-4" />
              Tambah Activity Type
            </Button>
          )
        }
      />

      <Card>
        <div className="flex flex-wrap items-center gap-3 border-b border-border p-4">
          <SearchInput
            value={params.search ?? ''}
            onChange={(search) => setParams((p) => ({ ...p, search, page: 1 }))}
            placeholder="Cari code / name..."
          />
        </div>

        {canEdit && (
          <BulkActionBar
            count={selection.selectedCount}
            itemLabel="activity type"
            onClear={selection.clear}
            onDelete={() => setBulkDeleteConfirmOpen(true)}
            isDeleting={bulkDelete.isRunning}
          />
        )}

        <div className="overflow-x-auto">
          <PmActivityTypeTable
            items={itemList}
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

        {data?.meta && <Pagination meta={data.meta} onPageChange={(page) => setParams((p) => ({ ...p, page }))} />}
      </Card>

      <PmActivityTypeFormDialog open={dialog.formOpen} onOpenChange={dialog.setFormOpen} activityType={dialog.editingItem} />

      <PmActivityTypeDetailDialog
        open={Boolean(dialog.viewingItem)}
        onOpenChange={(open) => !open && dialog.closeView()}
        activityType={dialog.viewingItem}
      />

      <ConfirmDialog
        open={bulkDeleteConfirmOpen}
        onOpenChange={setBulkDeleteConfirmOpen}
        title="Hapus Activity Type Terpilih"
        description={`${selection.selectedCount} activity type akan dihapus. Yang masih dipakai checklist item PM Program tidak akan terhapus dan akan dilaporkan sebagai gagal.`}
        loading={bulkDelete.isRunning}
        onConfirm={handleBulkDelete}
      />

      <ConfirmDialog
        open={Boolean(deletingItem)}
        onOpenChange={(open) => !open && setDeletingItem(null)}
        title="Hapus PM Activity Type"
        description={`Activity type "${deletingItem?.name}" akan dihapus. Aksi ini ditolak jika masih dipakai checklist item PM Program.`}
        loading={deleteMutation.isPending}
        onConfirm={confirmDelete}
      />
    </div>
  );
}
