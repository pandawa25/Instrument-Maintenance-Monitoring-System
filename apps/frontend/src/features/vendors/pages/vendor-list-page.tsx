import { useState } from 'react';
import { Building2, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Select } from '@/components/ui/select';
import { SearchInput } from '@/components/shared/search-input';
import { Pagination } from '@/components/shared/pagination';
import { ConfirmDialog } from '@/components/shared/confirm-dialog';
import { PageHeader } from '@/components/shared/page-header';
import { BulkActionBar } from '@/components/shared/bulk-action-bar';
import { useVendors, useDeleteVendor, useUpdateVendor } from '../hooks/use-vendors';
import { VendorTable } from '../components/vendor-table';
import { VendorFormDialog } from '../components/vendor-form-dialog';
import { VendorDetailDialog } from '../components/vendor-detail-dialog';
import { usePermission } from '@/store/auth.store';
import type { Vendor, VendorQueryParams } from '../types/vendor.types';
import { useQueryParamsState } from '@/lib/use-query-params-state';
import { useCrudDialogState, useCrudDelete } from '@/lib/use-crud-dialog-state';
import { useBulkSelection } from '@/lib/use-bulk-selection';
import { useBulkAction } from '@/lib/use-bulk-action';

const DEFAULT_PARAMS: VendorQueryParams = { page: 1, limit: 20, search: '', status: '' };

export function VendorListPage() {
  const canCreate = usePermission('VENDOR', 'create');
  const canEdit = usePermission('VENDOR', 'edit');

  const [params, setParams] = useQueryParamsState<VendorQueryParams>(DEFAULT_PARAMS);
  const dialog = useCrudDialogState<Vendor>();
  const [bulkDeleteConfirmOpen, setBulkDeleteConfirmOpen] = useState(false);

  const { data, isLoading } = useVendors(params);
  const vendorList = data?.data ?? [];
  const deleteMutation = useDeleteVendor();
  const updateMutation = useUpdateVendor();
  const { deletingItem, setDeletingItem, confirmDelete } = useCrudDelete<Vendor>({
    deleteMutation,
    getId: (vendor) => vendor.id,
    successMessage: (vendor) => `Vendor "${vendor.name}" berhasil dihapus`,
    errorMessage: 'Gagal menghapus vendor',
  });

  const selection = useBulkSelection<Vendor>(vendorList, (vendor) => vendor.id, params);

  const bulkDelete = useBulkAction({
    action: (id) => deleteMutation.mutateAsync(id),
    successMessage: (count) => `${count} vendor berhasil dihapus`,
    failureMessage: (succeeded, failed) =>
      succeeded === 0
        ? `Gagal menghapus ${failed} vendor — mungkin masih ada PM Program aktif`
        : `${succeeded} vendor berhasil dihapus, ${failed} gagal (mungkin masih ada PM Program aktif)`,
  });

  const bulkSetActive = useBulkAction({
    action: (id) => updateMutation.mutateAsync({ id, payload: { status: 'ACTIVE' } }),
    successMessage: (count) => `${count} vendor berhasil diaktifkan`,
    failureMessage: (succeeded, failed) => `${succeeded} berhasil diaktifkan, ${failed} gagal diubah`,
  });

  const bulkSetInactive = useBulkAction({
    action: (id) => updateMutation.mutateAsync({ id, payload: { status: 'INACTIVE' } }),
    successMessage: (count) => `${count} vendor berhasil dinonaktifkan`,
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

        {canEdit && (
          <BulkActionBar
            count={selection.selectedCount}
            itemLabel="vendor"
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
          <VendorTable
            vendors={vendorList}
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

      <VendorFormDialog open={dialog.formOpen} onOpenChange={dialog.setFormOpen} vendor={dialog.editingItem} />

      <VendorDetailDialog open={Boolean(dialog.viewingItem)} onOpenChange={(open) => !open && dialog.closeView()} vendor={dialog.viewingItem} />

      <ConfirmDialog
        open={bulkDeleteConfirmOpen}
        onOpenChange={setBulkDeleteConfirmOpen}
        title="Hapus Vendor Terpilih"
        description={`${selection.selectedCount} vendor akan dihapus. Vendor yang masih memiliki PM Program aktif tidak akan terhapus dan akan dilaporkan sebagai gagal.`}
        loading={bulkDelete.isRunning}
        onConfirm={handleBulkDelete}
      />

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
