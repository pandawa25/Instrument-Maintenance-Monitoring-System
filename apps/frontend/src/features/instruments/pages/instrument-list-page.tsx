import { useState } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { SearchInput } from '@/components/shared/search-input';
import { Pagination } from '@/components/shared/pagination';
import { ConfirmDialog } from '@/components/shared/confirm-dialog';
import { useInstruments, useDeleteInstrument } from '../hooks/use-instruments';
import { useAreasLookup, useInstrumentTypes } from '../hooks/use-instrument-lookups';
import { InstrumentTable } from '../components/instrument-table';
import { InstrumentFormDialog } from '../components/instrument-form-dialog';
import { useAuthStore } from '@/store/auth.store';
import type { Instrument, InstrumentQueryParams } from '../types/instrument.types';

const DEFAULT_PARAMS: InstrumentQueryParams = {
  page: 1,
  limit: 20,
  search: '',
  areaId: '',
  instrumentTypeId: '',
  status: '',
};

export function InstrumentListPage() {
  const role = useAuthStore((s) => s.user?.role);
  const canEdit = role === 'Admin';

  const [params, setParams] = useState<InstrumentQueryParams>(DEFAULT_PARAMS);
  const [formOpen, setFormOpen] = useState(false);
  const [editingInstrument, setEditingInstrument] = useState<Instrument | null>(null);
  const [deletingInstrument, setDeletingInstrument] = useState<Instrument | null>(null);

  const { data, isLoading } = useInstruments(params);
  const { data: areas } = useAreasLookup();
  const { data: instrumentTypes } = useInstrumentTypes();
  const deleteMutation = useDeleteInstrument();

  function openCreate() {
    setEditingInstrument(null);
    setFormOpen(true);
  }

  function openEdit(instrument: Instrument) {
    setEditingInstrument(instrument);
    setFormOpen(true);
  }

  async function confirmDelete() {
    if (!deletingInstrument) return;
    await deleteMutation.mutateAsync(deletingInstrument.id);
    setDeletingInstrument(null);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-text">Master Instrument</h2>
          <p className="text-sm text-text-muted">Kelola data instrument pada seluruh area.</p>
        </div>
        {canEdit && (
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4" />
            Tambah Instrument
          </Button>
        )}
      </div>

      <div className="rounded-lg border border-border bg-surface">
        <div className="flex flex-wrap items-center gap-3 border-b border-border p-4">
          <SearchInput
            value={params.search ?? ''}
            onChange={(search) => setParams((p) => ({ ...p, search, page: 1 }))}
            placeholder="Cari tag number / nama instrument..."
          />
          <Select
            className="w-48"
            value={params.areaId}
            onChange={(e) => setParams((p) => ({ ...p, areaId: e.target.value, page: 1 }))}
          >
            <option value="">Semua Area</option>
            {areas?.map((area) => (
              <option key={area.id} value={area.id}>
                {area.areaCode}
              </option>
            ))}
          </Select>
          <Select
            className="w-48"
            value={params.instrumentTypeId}
            onChange={(e) => setParams((p) => ({ ...p, instrumentTypeId: e.target.value, page: 1 }))}
          >
            <option value="">Semua Type</option>
            {instrumentTypes?.map((type) => (
              <option key={type.id} value={type.id}>
                {type.typeName}
              </option>
            ))}
          </Select>
          <Select
            className="w-40"
            value={params.status}
            onChange={(e) =>
              setParams((p) => ({ ...p, status: e.target.value as InstrumentQueryParams['status'], page: 1 }))
            }
          >
            <option value="">Semua Status</option>
            <option value="ACTIVE">Active</option>
            <option value="STANDBY">Standby</option>
            <option value="OUT_OF_SERVICE">Out Of Service</option>
          </Select>
        </div>

        <div className="overflow-x-auto">
          <InstrumentTable
            instruments={data?.data ?? []}
            isLoading={isLoading}
            canEdit={canEdit}
            onEdit={openEdit}
            onDelete={setDeletingInstrument}
            onView={openEdit}
          />
        </div>

        {data?.meta && (
          <Pagination meta={data.meta} onPageChange={(page) => setParams((p) => ({ ...p, page }))} />
        )}
      </div>

      <InstrumentFormDialog open={formOpen} onOpenChange={setFormOpen} instrument={editingInstrument} />

      <ConfirmDialog
        open={Boolean(deletingInstrument)}
        onOpenChange={(open) => !open && setDeletingInstrument(null)}
        title="Hapus Instrument"
        description={`Instrument "${deletingInstrument?.tagNumber}" akan dihapus. Aksi ini ditolak jika instrument masih memiliki riwayat corrective maintenance.`}
        loading={deleteMutation.isPending}
        onConfirm={confirmDelete}
      />
    </div>
  );
}
