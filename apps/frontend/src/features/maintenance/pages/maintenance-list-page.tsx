import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Wrench, Download, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { SearchInput } from '@/components/shared/search-input';
import { Pagination } from '@/components/shared/pagination';
import { ConfirmDialog } from '@/components/shared/confirm-dialog';
import { PageHeader } from '@/components/shared/page-header';
import {
  useMaintenanceList,
  useDeleteMaintenance,
  useMaintenanceKpiSummary,
  useMaintenanceStatusCounts,
} from '../hooks/use-maintenance';
import { useAreasLookup } from '../hooks/use-maintenance-lookups';
import { exportMaintenance } from '../api/maintenance.api';
import { MaintenanceTable } from '../components/maintenance-table';
import { MaintenanceFormDialog } from '../components/maintenance-form-dialog';
import { MaintenanceSummaryCards } from '../components/maintenance-summary-cards';
import { MaintenanceStatusTabs } from '../components/maintenance-status-tabs';
import { useAuthStore } from '@/store/auth.store';
import type { Maintenance, MaintenanceQueryParams } from '../types/maintenance.types';
import { getErrorMessage } from '@/lib/axios';

const DEFAULT_PARAMS: MaintenanceQueryParams = {
  page: 1,
  limit: 20,
  search: '',
  areaId: '',
  equipmentId: '',
  status: '',
  priority: '',
  dateFrom: '',
  dateTo: '',
};

export function MaintenanceListPage() {
  const navigate = useNavigate();
  const role = useAuthStore((s) => s.user?.role);
  const canEdit = role === 'Admin';

  const [params, setParams] = useState<MaintenanceQueryParams>(DEFAULT_PARAMS);
  // Dialog ini sekarang cuma dipakai untuk "Buat e-SPK" (create) — View & Edit sudah
  // pindah ke halaman penuh MaintenanceDetailPage (/maintenance/:id).
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [deletingItem, setDeletingItem] = useState<Maintenance | null>(null);
  const [isExporting, setIsExporting] = useState(false);

  const { data, isLoading } = useMaintenanceList(params);
  const { data: kpiSummary, isLoading: kpiLoading } = useMaintenanceKpiSummary();
  const { data: statusCounts } = useMaintenanceStatusCounts(params);
  const { data: areas } = useAreasLookup();
  const deleteMutation = useDeleteMaintenance();

  async function confirmDelete() {
    if (!deletingItem) return;
    try {
      await deleteMutation.mutateAsync(deletingItem.id);
      toast.success(`Data maintenance "${deletingItem.spkNumber ?? deletingItem.equipment.tagNumber}" berhasil dihapus`);
      setDeletingItem(null);
    } catch (err: any) {
      toast.error(getErrorMessage(err, 'Gagal menghapus data maintenance'));
    }
  }

  async function handleExport() {
    setIsExporting(true);
    try {
      await exportMaintenance(params);
    } catch {
      toast.error('Gagal export data ke Excel');
    } finally {
      setIsExporting(false);
    }
  }

  return (
    <div className="space-y-4">
      <PageHeader
        icon={Wrench}
        title="Corrective Maintenance"
        description="Kelola dan pantau pekerjaan corrective maintenance instrumentasi."
        action={
          canEdit && (
            <Button onClick={() => setCreateDialogOpen(true)}>
              <Plus className="h-4 w-4" />
              Buat e-SPK
            </Button>
          )
        }
      />

      <MaintenanceSummaryCards summary={kpiSummary} isLoading={kpiLoading} />

      <Card>
        <MaintenanceStatusTabs
          value={params.status ?? ''}
          counts={statusCounts}
          onChange={(status) => setParams((p) => ({ ...p, status, page: 1 }))}
        />

        <div className="flex flex-wrap items-end gap-3 border-b border-border p-4">
          <SearchInput
            value={params.search ?? ''}
            onChange={(search) => setParams((p) => ({ ...p, search, page: 1 }))}
            placeholder="Cari No. e-SPK / tag number / deskripsi..."
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
            className="w-36"
            value={params.priority}
            onChange={(e) =>
              setParams((p) => ({ ...p, priority: e.target.value as MaintenanceQueryParams['priority'], page: 1 }))
            }
          >
            <option value="">Semua Priority</option>
            <option value="HIGH">High</option>
            <option value="MEDIUM">Medium</option>
            <option value="LOW">Low</option>
          </Select>

          <div>
            <label className="mb-1 block text-xs font-medium text-text-muted">Dari Tanggal</label>
            <Input
              type="date"
              className="w-40"
              value={params.dateFrom ?? ''}
              onChange={(e) => setParams((p) => ({ ...p, dateFrom: e.target.value, page: 1 }))}
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-text-muted">Sampai Tanggal</label>
            <Input
              type="date"
              className="w-40"
              value={params.dateTo ?? ''}
              onChange={(e) => setParams((p) => ({ ...p, dateTo: e.target.value, page: 1 }))}
            />
          </div>

          <Button variant="outline" onClick={() => setParams(DEFAULT_PARAMS)}>
            <RotateCcw className="h-4 w-4" />
            Reset
          </Button>

          <Button variant="outline" className="ml-auto" onClick={handleExport} disabled={isExporting}>
            <Download className="h-4 w-4" />
            {isExporting ? 'Mengekspor...' : 'Export'}
          </Button>
        </div>

        <div className="overflow-x-auto">
          <MaintenanceTable
            items={data?.data ?? []}
            isLoading={isLoading}
            canEdit={canEdit}
            onEdit={(item) => navigate(`/maintenance/${item.id}`, { state: { mode: 'edit' } })}
            onDelete={setDeletingItem}
            onView={(item) => navigate(`/maintenance/${item.id}`)}
          />
        </div>

        {data?.meta && (
          <Pagination meta={data.meta} onPageChange={(page) => setParams((p) => ({ ...p, page }))} />
        )}
      </Card>

      <MaintenanceFormDialog open={createDialogOpen} onOpenChange={setCreateDialogOpen} />

      <ConfirmDialog
        open={Boolean(deletingItem)}
        onOpenChange={(open) => !open && setDeletingItem(null)}
        title="Hapus Data Maintenance"
        description={`Data corrective maintenance ${deletingItem?.spkNumber ? `"${deletingItem.spkNumber}" ` : ''}untuk equipment "${deletingItem?.equipment.tagNumber}" akan dihapus.`}
        loading={deleteMutation.isPending}
        onConfirm={confirmDelete}
      />
    </div>
  );
}
