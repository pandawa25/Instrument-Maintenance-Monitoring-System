import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { SearchInput } from '@/components/shared/search-input';
import { Pagination } from '@/components/shared/pagination';
import { ConfirmDialog } from '@/components/shared/confirm-dialog';
import { useVendorsLookup } from '@/features/vendors/hooks/use-vendors';
import { usePmProgramList, useDeletePmProgram } from '../hooks/use-pm-programs';
import { PmProgramTable } from '../components/pm-program-table';
import { PmProgramFormDialog } from '../components/pm-program-form-dialog';
import { useAuthStore } from '@/store/auth.store';
import type { PmProgramListItem, PmProgramQueryParams } from '../types/pm-program.types';

const DEFAULT_PARAMS: PmProgramQueryParams = { page: 1, limit: 20, search: '', status: '', vendorId: '' };

export function PmProgramListPage() {
  const navigate = useNavigate();
  const role = useAuthStore((s) => s.user?.role);
  const canEdit = role === 'Admin';

  const [params, setParams] = useState<PmProgramQueryParams>(DEFAULT_PARAMS);
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingItem, setDeletingItem] = useState<PmProgramListItem | null>(null);

  const { data, isLoading } = usePmProgramList(params);
  const { data: vendors } = useVendorsLookup();
  const deleteMutation = useDeletePmProgram();

  function openCreate() {
    setEditingId(null);
    setFormOpen(true);
  }

  function openEdit(item: PmProgramListItem) {
    setEditingId(item.id);
    setFormOpen(true);
  }

  function openDetail(item: PmProgramListItem) {
    navigate(`/pm-programs/${item.id}`);
  }

  async function confirmDelete() {
    if (!deletingItem) return;
    await deleteMutation.mutateAsync(deletingItem.id);
    setDeletingItem(null);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-text">Preventive Maintenance Program</h2>
          <p className="text-sm text-text-muted">
            Kelola program PM (judul, periode, vendor, dan equipment yang dicakup).
          </p>
        </div>
        {canEdit && (
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4" />
            Tambah PM Program
          </Button>
        )}
      </div>

      <div className="rounded-xl border border-border/70 bg-surface shadow-sm">
        <div className="flex flex-wrap items-center gap-3 border-b border-border p-4">
          <SearchInput
            value={params.search ?? ''}
            onChange={(search) => setParams((p) => ({ ...p, search, page: 1 }))}
            placeholder="Cari judul PM program..."
          />
          <Select
            className="w-44"
            value={params.vendorId}
            onChange={(e) => setParams((p) => ({ ...p, vendorId: e.target.value, page: 1 }))}
          >
            <option value="">Semua Vendor</option>
            {vendors?.map((v) => (
              <option key={v.id} value={v.id}>
                {v.name}
              </option>
            ))}
          </Select>
          <Select
            className="w-40"
            value={params.status}
            onChange={(e) => setParams((p) => ({ ...p, status: e.target.value as PmProgramQueryParams['status'], page: 1 }))}
          >
            <option value="">Semua Status</option>
            <option value="ACTIVE">Active</option>
            <option value="INACTIVE">Inactive</option>
          </Select>
        </div>

        <div className="overflow-x-auto">
          <PmProgramTable
            programs={data?.data ?? []}
            isLoading={isLoading}
            canEdit={canEdit}
            onEdit={openEdit}
            onDelete={setDeletingItem}
            onView={openDetail}
          />
        </div>

        {data?.meta && <Pagination meta={data.meta} onPageChange={(page) => setParams((p) => ({ ...p, page }))} />}
      </div>

      <PmProgramFormDialog open={formOpen} onOpenChange={setFormOpen} programId={editingId} />

      <ConfirmDialog
        open={Boolean(deletingItem)}
        onOpenChange={(open) => !open && setDeletingItem(null)}
        title="Hapus PM Program"
        description={`PM Program "${deletingItem?.name}" akan dihapus. Aksi ini ditolak jika program masih memiliki periode — nonaktifkan (status Inactive) untuk menghentikan tanpa menghapus histori.`}
        loading={deleteMutation.isPending}
        onConfirm={confirmDelete}
      />
    </div>
  );
}
