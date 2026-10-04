import { useState } from 'react';
import { Building2, Plus } from 'lucide-react';
import { toast } from 'sonner';
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
import { getErrorMessage } from '@/lib/axios';

const DEFAULT_PARAMS: VendorQueryParams = { page: 1, limit: 20, search: '', status: '' };

export function VendorListPage() {
  const canCreate = usePermission('VENDOR', 'create');
  const canEdit = usePermission('VENDOR', 'edit');

  const [params, setParams] = useState<VendorQueryParams>(DEFAULT_PARAMS);
  const [formOpen, setFormOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Vendor | null>(null);
  const [viewingItem, setViewingItem] = useState<Vendor | null>(null);
  const [deletingItem, setDeletingItem] = useState<Vendor | null>(null);

  const { data, isLoading } = useVendors(params);
  const deleteMutation = useDeleteVendor();

  function openCreate() {
    setEditingItem(null);
    setFormOpen(true);
  }

  function openEdit(item: Vendor) {
    setEditingItem(item);
    setFormOpen(true);
  }

  async function confirmDelete() {
    if (!deletingItem) return;
    try {
      await deleteMutation.mutateAsync(deletingItem.id);
      toast.success(`Vendor "${deletingItem.name}" berhasil dihapus`);
      setDeletingItem(null);
    } catch (err: any) {
      toast.error(getErrorMessage(err, 'Gagal menghapus vendor'));
    }
  }

  return (
    <div className="space-y-4">
      <PageHeader
        icon={Building2}
        title="Master Vendor"
        description="Kelola vendor pelaksana Preventive Maintenance."
        action={
          canCreate && (
            <Button onClick={openCreate}>
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
            onEdit={openEdit}
            onDelete={setDeletingItem}
            onView={setViewingItem}
          />
        </div>

        {data?.meta && <Pagination meta={data.meta} onPageChange={(page) => setParams((p) => ({ ...p, page }))} />}
      </Card>

      <VendorFormDialog open={formOpen} onOpenChange={setFormOpen} vendor={editingItem} />

      <VendorDetailDialog open={Boolean(viewingItem)} onOpenChange={(open) => !open && setViewingItem(null)} vendor={viewingItem} />

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
