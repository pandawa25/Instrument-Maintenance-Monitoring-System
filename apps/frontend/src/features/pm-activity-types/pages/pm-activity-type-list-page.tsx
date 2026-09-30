import { useState } from 'react';
import { ListChecks, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { SearchInput } from '@/components/shared/search-input';
import { Pagination } from '@/components/shared/pagination';
import { ConfirmDialog } from '@/components/shared/confirm-dialog';
import { PageHeader } from '@/components/shared/page-header';
import { usePmActivityTypeList, useDeletePmActivityType } from '../hooks/use-pm-activity-types';
import { PmActivityTypeTable } from '../components/pm-activity-type-table';
import { PmActivityTypeFormDialog } from '../components/pm-activity-type-form-dialog';
import { PmActivityTypeDetailDialog } from '../components/pm-activity-type-detail-dialog';
import { useAuthStore } from '@/store/auth.store';
import type { PmActivityType, PmActivityTypeQueryParams } from '../types/pm-activity-type.types';

const DEFAULT_PARAMS: PmActivityTypeQueryParams = { page: 1, limit: 20, search: '' };

export function PmActivityTypeListPage() {
  const role = useAuthStore((s) => s.user?.role);
  const canEdit = role === 'Admin';

  const [params, setParams] = useState<PmActivityTypeQueryParams>(DEFAULT_PARAMS);
  const [formOpen, setFormOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<PmActivityType | null>(null);
  const [viewingItem, setViewingItem] = useState<PmActivityType | null>(null);
  const [deletingItem, setDeletingItem] = useState<PmActivityType | null>(null);

  const { data, isLoading } = usePmActivityTypeList(params);
  const deleteMutation = useDeletePmActivityType();

  function openCreate() {
    setEditingItem(null);
    setFormOpen(true);
  }

  function openEdit(item: PmActivityType) {
    setEditingItem(item);
    setFormOpen(true);
  }

  async function confirmDelete() {
    if (!deletingItem) return;
    try {
      await deleteMutation.mutateAsync(deletingItem.id);
      toast.success(`Activity type "${deletingItem.name}" berhasil dihapus`);
      setDeletingItem(null);
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'Gagal menghapus activity type');
    }
  }

  return (
    <div className="space-y-4">
      <PageHeader
        icon={ListChecks}
        title="Master PM Activity Type"
        description="Kelola jenis aktifitas PM (Cleaning, Calibration, dst) untuk checklist PM Program."
        action={
          canEdit && (
            <Button onClick={openCreate}>
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

        <div className="overflow-x-auto">
          <PmActivityTypeTable
            items={data?.data ?? []}
            isLoading={isLoading}
            canEdit={canEdit}
            onEdit={openEdit}
            onDelete={setDeletingItem}
            onView={setViewingItem}
          />
        </div>

        {data?.meta && <Pagination meta={data.meta} onPageChange={(page) => setParams((p) => ({ ...p, page }))} />}
      </Card>

      <PmActivityTypeFormDialog open={formOpen} onOpenChange={setFormOpen} activityType={editingItem} />

      <PmActivityTypeDetailDialog
        open={Boolean(viewingItem)}
        onOpenChange={(open) => !open && setViewingItem(null)}
        activityType={viewingItem}
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
