import { useState } from 'react';
import { PackageSearch, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Select } from '@/components/ui/select';
import { SearchInput } from '@/components/shared/search-input';
import { Pagination } from '@/components/shared/pagination';
import { ConfirmDialog } from '@/components/shared/confirm-dialog';
import { PageHeader } from '@/components/shared/page-header';
import { useSpareParts, useDeleteSparePart } from '../hooks/use-spare-parts';
import { SparePartTable } from '../components/spare-part-table';
import { SparePartFormDialog } from '../components/spare-part-form-dialog';
import { SparePartDetailDialog } from '../components/spare-part-detail-dialog';
import { StockMovementDialog } from '../components/stock-movement-dialog';
import { usePermission } from '@/store/auth.store';
import type { SparePart, SparePartQueryParams } from '../types/spare-part.types';
import { getErrorMessage } from '@/lib/axios';

const DEFAULT_PARAMS: SparePartQueryParams = { page: 1, limit: 20, search: '', status: '' };

export function SparePartListPage() {
  const canCreate = usePermission('SPARE_PART', 'create');
  const canEdit = usePermission('SPARE_PART', 'edit');

  const [params, setParams] = useState<SparePartQueryParams>(DEFAULT_PARAMS);
  const [formOpen, setFormOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<SparePart | null>(null);
  const [viewingItem, setViewingItem] = useState<SparePart | null>(null);
  const [deletingItem, setDeletingItem] = useState<SparePart | null>(null);
  const [stockItem, setStockItem] = useState<SparePart | null>(null);

  const { data, isLoading } = useSpareParts(params);
  const deleteMutation = useDeleteSparePart();

  function openCreate() {
    setEditingItem(null);
    setFormOpen(true);
  }

  function openEdit(item: SparePart) {
    setEditingItem(item);
    setFormOpen(true);
  }

  async function confirmDelete() {
    if (!deletingItem) return;
    try {
      await deleteMutation.mutateAsync(deletingItem.id);
      toast.success(`Spare part "${deletingItem.name}" berhasil dihapus`);
      setDeletingItem(null);
    } catch (err: any) {
      toast.error(getErrorMessage(err, 'Gagal menghapus spare part / material'));
    }
  }

  return (
    <div className="space-y-4">
      <PageHeader
        icon={PackageSearch}
        title="Master Spare Part / Material"
        description="Kelola master spare part / material untuk kebutuhan Corrective Maintenance."
        action={
          canCreate && (
            <Button onClick={openCreate}>
              <Plus className="h-4 w-4" />
              Tambah Spare Part
            </Button>
          )
        }
      />

      <Card>
        <div className="flex flex-wrap items-center gap-3 border-b border-border p-4">
          <SearchInput
            value={params.search ?? ''}
            onChange={(search) => setParams((p) => ({ ...p, search, page: 1 }))}
            placeholder="Cari KIMAP / nama material..."
          />
          <Select
            className="w-40"
            value={params.status}
            onChange={(e) => setParams((p) => ({ ...p, status: e.target.value as SparePartQueryParams['status'], page: 1 }))}
          >
            <option value="">Semua Status</option>
            <option value="ACTIVE">Active</option>
            <option value="INACTIVE">Inactive</option>
          </Select>
        </div>

        <div className="overflow-x-auto">
          <SparePartTable
            items={data?.data ?? []}
            isLoading={isLoading}
            canEdit={canEdit}
            onEdit={openEdit}
            onDelete={setDeletingItem}
            onView={setViewingItem}
            onStockMovement={setStockItem}
          />
        </div>

        {data?.meta && <Pagination meta={data.meta} onPageChange={(page) => setParams((p) => ({ ...p, page }))} />}
      </Card>

      <SparePartFormDialog open={formOpen} onOpenChange={setFormOpen} sparePart={editingItem} />

      <SparePartDetailDialog open={Boolean(viewingItem)} onOpenChange={(open) => !open && setViewingItem(null)} sparePart={viewingItem} />

      <StockMovementDialog
        open={Boolean(stockItem)}
        onOpenChange={(open) => !open && setStockItem(null)}
        sparePart={stockItem}
        canEdit={canEdit}
        onSparePartUpdated={setStockItem}
      />

      <ConfirmDialog
        open={Boolean(deletingItem)}
        onOpenChange={(open) => !open && setDeletingItem(null)}
        title="Hapus Spare Part / Material"
        description={`Spare part "${deletingItem?.name}" akan dihapus. Aksi ini ditolak jika masih dipakai pada data Corrective Maintenance.`}
        loading={deleteMutation.isPending}
        onConfirm={confirmDelete}
      />
    </div>
  );
}
