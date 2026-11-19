import { useState } from 'react';
import { Plus, Tag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { SearchInput } from '@/components/shared/search-input';
import { Pagination } from '@/components/shared/pagination';
import { ConfirmDialog } from '@/components/shared/confirm-dialog';
import { PageHeader } from '@/components/shared/page-header';
import { BulkActionBar } from '@/components/shared/bulk-action-bar';
import { useInstrumentNameList, useDeleteInstrumentName } from '../hooks/use-instrument-names';
import { InstrumentNameTable } from '../components/instrument-name-table';
import { InstrumentNameFormDialog } from '../components/instrument-name-form-dialog';
import { InstrumentNameDetailDialog } from '../components/instrument-name-detail-dialog';
import { usePermission } from '@/store/auth.store';
import type { InstrumentName, InstrumentNameQueryParams } from '../types/instrument-name.types';
import { useQueryParamsState } from '@/lib/use-query-params-state';
import { useCrudDialogState, useCrudDelete } from '@/lib/use-crud-dialog-state';
import { useBulkSelection } from '@/lib/use-bulk-selection';
import { useBulkAction } from '@/lib/use-bulk-action';

const DEFAULT_PARAMS: InstrumentNameQueryParams = { page: 1, limit: 20, search: '' };

export function InstrumentNameListPage() {
  const canCreate = usePermission('INSTRUMENT_NAME', 'create');
  const canEdit = usePermission('INSTRUMENT_NAME', 'edit');

  const [params, setParams] = useQueryParamsState<InstrumentNameQueryParams>(DEFAULT_PARAMS);
  const dialog = useCrudDialogState<InstrumentName>();
  const [bulkDeleteConfirmOpen, setBulkDeleteConfirmOpen] = useState(false);

  const { data, isLoading } = useInstrumentNameList(params);
  const itemList = data?.data ?? [];
  const deleteMutation = useDeleteInstrumentName();
  const { deletingItem, setDeletingItem, confirmDelete } = useCrudDelete<InstrumentName>({
    deleteMutation,
    getId: (item) => item.id,
    successMessage: (item) => `Instrument name "${item.name}" berhasil dihapus`,
    errorMessage: 'Gagal menghapus instrument name',
  });

  const selection = useBulkSelection<InstrumentName>(itemList, (item) => item.id, params);

  const bulkDelete = useBulkAction({
    action: (id) => deleteMutation.mutateAsync(id),
    successMessage: (count) => `${count} instrument name berhasil dihapus`,
    failureMessage: (succeeded, failed) =>
      succeeded === 0
        ? `Gagal menghapus ${failed} instrument name — mungkin masih dipakai equipment aktif`
        : `${succeeded} berhasil dihapus, ${failed} gagal (mungkin masih dipakai equipment aktif)`,
  });

  async function handleBulkDelete() {
    await bulkDelete.run(Array.from(selection.selectedIds));
    setBulkDeleteConfirmOpen(false);
    selection.clear();
  }

  return (
    <div className="space-y-4">
      <PageHeader
        icon={Tag}
        title="Master Instrument Name"
        description="Kelola master data jenis instrument (dipakai di form Equipment)."
        action={
          canCreate && (
            <Button onClick={dialog.openCreate}>
              <Plus className="h-4 w-4" />
              Tambah Instrument Name
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
            itemLabel="instrument name"
            onClear={selection.clear}
            onDelete={() => setBulkDeleteConfirmOpen(true)}
            isDeleting={bulkDelete.isRunning}
          />
        )}

        <div className="overflow-x-auto">
          <InstrumentNameTable
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

        {data?.meta && (
          <Pagination meta={data.meta} onPageChange={(page) => setParams((p) => ({ ...p, page }))} />
        )}
      </Card>

      <InstrumentNameFormDialog open={dialog.formOpen} onOpenChange={dialog.setFormOpen} instrumentName={dialog.editingItem} />

      <InstrumentNameDetailDialog
        open={Boolean(dialog.viewingItem)}
        onOpenChange={(open) => !open && dialog.closeView()}
        instrumentName={dialog.viewingItem}
      />

      <ConfirmDialog
        open={bulkDeleteConfirmOpen}
        onOpenChange={setBulkDeleteConfirmOpen}
        title="Hapus Instrument Name Terpilih"
        description={`${selection.selectedCount} instrument name akan dihapus. Yang masih dipakai oleh equipment aktif tidak akan terhapus dan akan dilaporkan sebagai gagal.`}
        loading={bulkDelete.isRunning}
        onConfirm={handleBulkDelete}
      />

      <ConfirmDialog
        open={Boolean(deletingItem)}
        onOpenChange={(open) => !open && setDeletingItem(null)}
        title="Hapus Instrument Name"
        description={`Instrument name "${deletingItem?.name}" akan dihapus. Aksi ini ditolak jika masih dipakai oleh equipment aktif.`}
        loading={deleteMutation.isPending}
        onConfirm={confirmDelete}
      />
    </div>
  );
}
