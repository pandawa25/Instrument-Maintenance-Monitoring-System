import { Building2, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Select } from '@/components/ui/select';
import { SearchInput } from '@/components/shared/search-input';
import { Pagination } from '@/components/shared/pagination';
import { ConfirmDialog } from '@/components/shared/confirm-dialog';
import { PageHeader } from '@/components/shared/page-header';
import { useVendors, useDeleteVendor } from '../hooks/use-vendors';
import { VendorTable } from '../components/vendor-table';
import { VendorFormDialog } from '../components/vendor-form-dialog';
import { VendorDetailDialog } from '../components/vendor-detail-dialog';
import { usePermission } from '@/store/auth.store';
import type { Vendor, VendorQueryParams } from '../types/vendor.types';
import { useQueryParamsState } from '@/lib/use-query-params-state';
import { useCrudDialogState, useCrudDelete } from '@/lib/use-crud-dialog-state';

const DEFAULT_PARAMS: VendorQueryParams = { page: 1, limit: 20, search: '', status: '' };

export function VendorListPage() {
  const canCreate = usePermission('VENDOR', 'create');
  const canEdit = usePermission('VENDOR', 'edit');

  const [params, setParams] = useQueryParamsState<VendorQueryParams>(DEFAULT_PARAMS);
  const dialog = useCrudDialogState<Vendor>();

  const { data, isLoading } = useVendors(params);
  const deleteMutation = useDeleteVendor();
  const { deletingItem, setDeletingItem, confirmDelete } = useCrudDelete<Vendor>({
    deleteMutation,
    getId: (vendor) => vendor.id,
    successMessage: (vendor) => `Vendor "${vendor.name}" berhasil dihapus`,
    errorMessage: 'Gagal menghapus vendor',
  });

  return (
    <div className="space-y-4">
      <PageHeader
        icon={Building2}
        title="Master Vendor"
        description="Kelola vendor pelaksana Preventive Maintenance."
        action={
          canCreate && (
            <Button onClick={dialog.openCreate}>
              <Plus className="h-4 w-4" />
              Tambah Vendor
            </Button>
          )
        }
      />

      <Card>
        <div className="flex flex-wrap items-center gap-3 border-b border-border p-4">
          <SearchInput
            value={params.search ?? ''}
            onChange={(search) => setParams((p) => ({ ...p, search, page: 1 }))}
            placeholder="Cari nama vendor / contact person..."
          />
          <Select
            className="w-40"
            value={params.status}
            onChange={(e) => setParams((p) => ({ ...p, status: e.target.value as VendorQueryParams['status'], page: 1 }))}
          >
            <option value="">Semua Status</option>
            <option value="ACTIVE">Active</option>
            <option value="INACTIVE">Inactive</option>
          </Select>
        </div>

        <div className="overflow-x-auto">
          <VendorTable
            vendors={data?.data ?? []}
            isLoading={isLoading}
            canEdit={canEdit}
            onEdit={dialog.openEdit}
            onDelete={setDeletingItem}
            onView={dialog.openView}
          />
        </div>

        {data?.meta && <Pagination meta={data.meta} onPageChange={(page) => setParams((p) => ({ ...p, page }))} />}
      </Card>

      <VendorFormDialog open={dialog.formOpen} onOpenChange={dialog.setFormOpen} vendor={dialog.editingItem} />

      <VendorDetailDialog open={Boolean(dialog.viewingItem)} onOpenChange={(open) => !open && dialog.closeView()} vendor={dialog.viewingItem} />

      <ConfirmDialog
        open={Boolean(deletingItem)}
        onOpenChange={(open) => !open && setDeletingItem(null)}
        title="Hapus Vendor"
        description={`Vendor "${deletingItem?.name}" akan dihapus. Aksi ini ditolak jika vendor masih memiliki PM Program aktif.`}
        loading={deleteMutation.isPending}
        onConfirm={confirmDelete}
      />
    </div>
  );
}
