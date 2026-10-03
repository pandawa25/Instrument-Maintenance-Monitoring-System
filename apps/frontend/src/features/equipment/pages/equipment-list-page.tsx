import { useEffect, useRef, useState } from 'react';
import { Download, Gauge, Plus, RotateCcw, SlidersHorizontal, UploadCloud } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Select } from '@/components/ui/select';
import { SearchInput } from '@/components/shared/search-input';
import { Pagination } from '@/components/shared/pagination';
import { ConfirmDialog } from '@/components/shared/confirm-dialog';
import { PageHeader } from '@/components/shared/page-header';
import { useEquipmentList, useDeleteEquipment, useEquipmentStatusCounts, useManufacturers } from '../hooks/use-equipment';
import { useAreasLookup, useInstrumentNames } from '../hooks/use-equipment-lookups';
import { exportEquipment } from '../api/equipment.api';
import { EquipmentTable } from '../components/equipment-table';
import { EquipmentFormDialog } from '../components/equipment-form-dialog';
import { EquipmentDetailDialog } from '../components/equipment-detail-dialog';
import { EquipmentBulkUploadDialog } from '../components/equipment-bulk-upload-dialog';
import { EquipmentSummaryCards } from '../components/equipment-summary-cards';
import { useAuthStore } from '@/store/auth.store';
import type { Equipment, EquipmentQueryParams } from '../types/equipment.types';
import { getErrorMessage } from '@/lib/axios';

const DEFAULT_PARAMS: EquipmentQueryParams = {
  page: 1,
  limit: 20,
  search: '',
  areaId: '',
  instrumentNameId: '',
  manufacturer: '',
  criticality: '',
  status: '',
};

export function EquipmentListPage() {
  const role = useAuthStore((s) => s.user?.role);
  const canEdit = role === 'Admin';

  const [params, setParams] = useState<EquipmentQueryParams>(DEFAULT_PARAMS);
  const [showMoreFilter, setShowMoreFilter] = useState(false);
  const criticalityFilterRef = useRef<HTMLSelectElement>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [bulkUploadOpen, setBulkUploadOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Equipment | null>(null);
  const [viewingItem, setViewingItem] = useState<Equipment | null>(null);
  const [deletingItem, setDeletingItem] = useState<Equipment | null>(null);
  const [isExporting, setIsExporting] = useState(false);

  const { data, isLoading } = useEquipmentList(params);
  const { data: statusCounts, isLoading: countsLoading } = useEquipmentStatusCounts(params);
  const { data: areas } = useAreasLookup();
  const { data: instrumentNames } = useInstrumentNames();
  const { data: manufacturers } = useManufacturers();
  const deleteMutation = useDeleteEquipment();

  // Pindahkan fokus ke field pertama saat panel "More Filter" dibuka — tanpa ini,
  // fokus keyboard tetap di tombol "More Filter" sehingga user screen reader/keyboard
  // tidak sadar panel baru saja muncul (focus management saat disclosure dibuka).
  useEffect(() => {
    if (showMoreFilter) {
      criticalityFilterRef.current?.focus();
    }
  }, [showMoreFilter]);

  async function handleExport() {
    setIsExporting(true);
    try {
      await exportEquipment(params);
    } catch {
      toast.error('Gagal export data ke Excel');
    } finally {
      setIsExporting(false);
    }
  }

  function openCreate() {
    setEditingItem(null);
    setFormOpen(true);
  }

  function openEdit(item: Equipment) {
    setEditingItem(item);
    setFormOpen(true);
  }

  async function confirmDelete() {
    if (!deletingItem) return;
    try {
      await deleteMutation.mutateAsync(deletingItem.id);
      toast.success(`Equipment "${deletingItem.tagNumber}" berhasil dihapus`);
      setDeletingItem(null);
    } catch (err: any) {
      toast.error(getErrorMessage(err, 'Gagal menghapus equipment'));
    }
  }

  return (
    <div className="space-y-4">
      <PageHeader
        icon={Gauge}
        title="Master Equipment"
        description="Kelola data equipment dan instrument di setiap area."
        action={
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={handleExport} disabled={isExporting}>
              <Download className="h-4 w-4" />
              {isExporting ? 'Mengekspor...' : 'Export'}
            </Button>
            {canEdit && (
              <>
                <Button variant="outline" onClick={() => setBulkUploadOpen(true)}>
                  <UploadCloud className="h-4 w-4" />
                  Bulk Upload
                </Button>
                <Button onClick={openCreate}>
                  <Plus className="h-4 w-4" />
                  Tambah Equipment
                </Button>
              </>
            )}
          </div>
        }
      />

      <EquipmentSummaryCards counts={statusCounts} isLoading={countsLoading} />

      <Card>
        <div className="flex flex-wrap items-center gap-3 border-b border-border p-4">
          <SearchInput
            value={params.search ?? ''}
            onChange={(search) => setParams((p) => ({ ...p, search, page: 1 }))}
            placeholder="Cari tag number / service..."
          />
          <Select
            className="w-44"
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
            className="w-44"
            value={params.instrumentNameId}
            onChange={(e) => setParams((p) => ({ ...p, instrumentNameId: e.target.value, page: 1 }))}
          >
            <option value="">Semua Type</option>
            {instrumentNames?.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </Select>
          <Select
            className="w-44"
            value={params.manufacturer}
            onChange={(e) => setParams((p) => ({ ...p, manufacturer: e.target.value, page: 1 }))}
          >
            <option value="">Semua Manufacturer</option>
            {manufacturers?.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </Select>
          <Select
            className="w-40"
            value={params.status}
            onChange={(e) =>
              setParams((p) => ({ ...p, status: e.target.value as EquipmentQueryParams['status'], page: 1 }))
            }
          >
            <option value="">Semua Status</option>
            <option value="ACTIVE">Active</option>
            <option value="STANDBY">Standby</option>
            <option value="OUT_OF_SERVICE">Out Of Service</option>
          </Select>

          <Button
            variant="outline"
            onClick={() => setShowMoreFilter((v) => !v)}
            aria-expanded={showMoreFilter}
            aria-controls="equipment-more-filter-panel"
          >
            <SlidersHorizontal className="h-4 w-4" />
            More Filter
          </Button>

          {(params.search ||
            params.areaId ||
            params.instrumentNameId ||
            params.manufacturer ||
            params.criticality ||
            params.status) && (
            <Button variant="ghost" className="text-text-muted" onClick={() => setParams(DEFAULT_PARAMS)}>
              <RotateCcw className="h-4 w-4" />
              Reset
            </Button>
          )}
        </div>

        {showMoreFilter && (
          <div id="equipment-more-filter-panel" className="flex flex-wrap items-center gap-3 border-b border-border bg-surface-2/40 p-4">
            <div>
              <label className="mb-1 block text-xs font-medium text-text-muted">Criticality</label>
              <Select
                ref={criticalityFilterRef}
                className="w-40"
                value={params.criticality}
                onChange={(e) =>
                  setParams((p) => ({
                    ...p,
                    criticality: e.target.value as EquipmentQueryParams['criticality'],
                    page: 1,
                  }))
                }
              >
                <option value="">Semua Criticality</option>
                <option value="HIGH">High</option>
                <option value="MEDIUM">Medium</option>
                <option value="LOW">Low</option>
              </Select>
            </div>
          </div>
        )}

        <div className="overflow-x-auto">
          <EquipmentTable
            equipment={data?.data ?? []}
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
      </Card>

      <EquipmentFormDialog open={formOpen} onOpenChange={setFormOpen} equipment={editingItem} />

      <EquipmentBulkUploadDialog open={bulkUploadOpen} onOpenChange={setBulkUploadOpen} />

      <EquipmentDetailDialog
        open={Boolean(viewingItem)}
        onOpenChange={(open) => !open && setViewingItem(null)}
        equipment={viewingItem}
      />

      <ConfirmDialog
        open={Boolean(deletingItem)}
        onOpenChange={(open) => !open && setDeletingItem(null)}
        title="Hapus Equipment"
        description={`Equipment "${deletingItem?.tagNumber}" akan dihapus. Aksi ini ditolak jika equipment masih memiliki riwayat corrective maintenance.`}
        loading={deleteMutation.isPending}
        onConfirm={confirmDelete}
      />
    </div>
  );
}
