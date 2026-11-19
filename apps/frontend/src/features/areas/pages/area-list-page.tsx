import { MapPinned, Plus } from 'lucide-react';
import { useQueryParamsState } from '@/lib/use-query-params-state';
import { useCrudDialogState, useCrudDelete } from '@/lib/use-crud-dialog-state';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Select } from '@/components/ui/select';
import { SearchInput } from '@/components/shared/search-input';
import { Pagination } from '@/components/shared/pagination';
import { ConfirmDialog } from '@/components/shared/confirm-dialog';
import { PageHeader } from '@/components/shared/page-header';
import { useAreas, useDeleteArea } from '../hooks/use-areas';
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

  const { data, isLoading } = useAreas(params);
  const deleteMutation = useDeleteArea();
  const { deletingItem, setDeletingItem, confirmDelete } = useCrudDelete<Area>({
    deleteMutation,
    getId: (area) => area.id,
    successMessage: (area) => `Area "${area.areaName}" berhasil dihapus`,
    errorMessage: 'Gagal menghapus area',
  });

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

        <div className="overflow-x-auto">
          <AreaTable
            areas={data?.data ?? []}
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

      <AreaFormDialog open={dialog.formOpen} onOpenChange={dialog.setFormOpen} area={dialog.editingItem} />

      <AreaDetailDialog open={Boolean(dialog.viewingItem)} onOpenChange={(open) => !open && dialog.closeView()} area={dialog.viewingItem} />

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
