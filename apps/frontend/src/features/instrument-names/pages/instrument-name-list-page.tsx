import { useState } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SearchInput } from '@/components/shared/search-input';
import { Pagination } from '@/components/shared/pagination';
import { ConfirmDialog } from '@/components/shared/confirm-dialog';
import { useInstrumentNameList, useDeleteInstrumentName } from '../hooks/use-instrument-names';
import { InstrumentNameTable } from '../components/instrument-name-table';
import { InstrumentNameFormDialog } from '../components/instrument-name-form-dialog';
import { InstrumentNameDetailDialog } from '../components/instrument-name-detail-dialog';
import { useAuthStore } from '@/store/auth.store';
import type { InstrumentName, InstrumentNameQueryParams } from '../types/instrument-name.types';

const DEFAULT_PARAMS: InstrumentNameQueryParams = { page: 1, limit: 20, search: '' };

export function InstrumentNameListPage() {
  const role = useAuthStore((s) => s.user?.role);
  const canEdit = role === 'Admin';

  const [params, setParams] = useState<InstrumentNameQueryParams>(DEFAULT_PARAMS);
  const [formOpen, setFormOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<InstrumentName | null>(null);
  const [viewingItem, setViewingItem] = useState<InstrumentName | null>(null);
  const [deletingItem, setDeletingItem] = useState<InstrumentName | null>(null);

  const { data, isLoading } = useInstrumentNameList(params);
  const deleteMutation = useDeleteInstrumentName();

  function openCreate() {
    setEditingItem(null);
    setFormOpen(true);
  }

  function openEdit(item: InstrumentName) {
    setEditingItem(item);
    setFormOpen(true);
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
          <h2 className="text-lg font-semibold text-text">Master Instrument Name</h2>
          <p className="text-sm text-text-muted">Kelola master data jenis instrument (dipakai di form Equipment).</p>
        </div>
        {canEdit && (
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4" />
            Tambah Instrument Name
          </Button>
        )}
      </div>

      <div className="rounded-xl border border-border/70 bg-surface shadow-sm">
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
            onEdit={openEdit}
            onDelete={setDeletingItem}
            onView={setViewingItem}
          />
        </div>

        {data?.meta && (
          <Pagination meta={data.meta} onPageChange={(page) => setParams((p) => ({ ...p, page }))} />
        )}
      </div>

      <InstrumentNameFormDialog open={formOpen} onOpenChange={setFormOpen} instrumentName={editingItem} />

      <InstrumentNameDetailDialog
        open={Boolean(viewingItem)}
        onOpenChange={(open) => !open && setViewingItem(null)}
        instrumentName={viewingItem}
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
