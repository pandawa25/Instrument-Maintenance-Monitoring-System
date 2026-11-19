import { Plus, Tag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { SearchInput } from '@/components/shared/search-input';
import { Pagination } from '@/components/shared/pagination';
import { ConfirmDialog } from '@/components/shared/confirm-dialog';
import { PageHeader } from '@/components/shared/page-header';
import { useInstrumentNameList, useDeleteInstrumentName } from '../hooks/use-instrument-names';
import { InstrumentNameTable } from '../components/instrument-name-table';
import { InstrumentNameFormDialog } from '../components/instrument-name-form-dialog';
import { InstrumentNameDetailDialog } from '../components/instrument-name-detail-dialog';
import { usePermission } from '@/store/auth.store';
import type { InstrumentName, InstrumentNameQueryParams } from '../types/instrument-name.types';
import { useQueryParamsState } from '@/lib/use-query-params-state';
import { useCrudDialogState, useCrudDelete } from '@/lib/use-crud-dialog-state';

const DEFAULT_PARAMS: InstrumentNameQueryParams = { page: 1, limit: 20, search: '' };

export function InstrumentNameListPage() {
  const canCreate = usePermission('INSTRUMENT_NAME', 'create');
  const canEdit = usePermission('INSTRUMENT_NAME', 'edit');

  const [params, setParams] = useQueryParamsState<InstrumentNameQueryParams>(DEFAULT_PARAMS);
  const dialog = useCrudDialogState<InstrumentName>();

  const { data, isLoading } = useInstrumentNameList(params);
  const deleteMutation = useDeleteInstrumentName();
  const { deletingItem, setDeletingItem, confirmDelete } = useCrudDelete<InstrumentName>({
    deleteMutation,
    getId: (item) => item.id,
    successMessage: (item) => `Instrument name "${item.name}" berhasil dihapus`,
    errorMessage: 'Gagal menghapus instrument name',
  });

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

        <div className="overflow-x-auto">
          <InstrumentNameTable
            items={data?.data ?? []}
            isLoading={isLoading}
            canEdit={canEdit}
            onEdit={dialog.openEdit}
            onDelete={setDeletingItem}
            onView={dialog.openView}
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
