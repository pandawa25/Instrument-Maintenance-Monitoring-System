import { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { ClipboardList, RotateCcw, UploadCloud } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { SearchInput } from '@/components/shared/search-input';
import { Pagination } from '@/components/shared/pagination';
import { PageHeader } from '@/components/shared/page-header';
import { useWorkOrderList, useWorkOrderStageCounts } from '../hooks/use-work-orders';
import { LifecycleStepper } from '../components/lifecycle-stepper';
import { WorkOrderTable } from '../components/work-order-table';
import { WorkOrderDetailDialog } from '../components/work-order-detail-dialog';
import { WorkOrderImportDialog } from '../components/work-order-import-dialog';
import { useAuthStore } from '@/store/auth.store';
import type { WorkOrderLifecycleStage, WorkOrderQueryParams } from '../types/work-order.types';

// Default sort by Basic Start Date (terbaru dulu) — paling relevan untuk tanggal kerja
// aktual di ERP, bukan urutan insert ke database. Lihat juga SORTABLE_FIELDS di
// WorkOrdersRepository (backend sudah siap kalau nanti perlu sort kolom lain).
const DEFAULT_PARAMS: WorkOrderQueryParams = {
  page: 1,
  limit: 20,
  search: '',
  sortBy: 'basicStartDate',
  sortOrder: 'desc',
};

// Modul Notification & Work Order (link ERP) — lihat docs/design-notification-work-order.md.
// Stepper di atas = ringkasan + filter klik (bukan workflow yang bisa diubah manual, lihat
// LifecycleStepper). Tab "Antrian Belum Terhubung" memakai filter unmatchedOnly yang sama.
interface NavState {
  lifecycleStage?: WorkOrderLifecycleStage;
  tab?: 'all' | 'unmatched';
}

export function WorkOrderListPage() {
  const isAdmin = useAuthStore((s) => s.user?.role === 'Admin');
  // State navigasi opsional dari halaman lain (mis. kartu/panel Dashboard) — pola sama
  // dengan EquipmentDetailPage (location.state?.mode) — supaya klik di Dashboard bisa
  // langsung membawa filter yang relevan ke sini.
  const location = useLocation();
  const navState = location.state as NavState | null;
  const [params, setParams] = useState<WorkOrderQueryParams>({
    ...DEFAULT_PARAMS,
    lifecycleStage: navState?.lifecycleStage,
  });
  const [tab, setTab] = useState<'all' | 'unmatched'>(navState?.tab ?? 'all');
  const [viewingId, setViewingId] = useState<string | null>(null);
  const [importOpen, setImportOpen] = useState(false);

  const effectiveParams: WorkOrderQueryParams = { ...params, unmatchedOnly: tab === 'unmatched' || undefined };
  const { data, isLoading } = useWorkOrderList(effectiveParams);
  const { data: stageCounts } = useWorkOrderStageCounts(effectiveParams);

  function toggleStage(stage: WorkOrderLifecycleStage) {
    setParams((p) => ({ ...p, lifecycleStage: p.lifecycleStage === stage ? undefined : stage, page: 1 }));
  }

  const hasActiveFilter = Boolean(params.search || params.lifecycleStage || params.dateFrom || params.dateTo);

  return (
    <div className="space-y-4">
      <PageHeader
        icon={ClipboardList}
        title="Work Order & Notifikasi"
        description="Data Notification & Work Order hasil import dari ERP (mis. SAP PM), terhubung ke Equipment lewat Tag Number."
        action={
          isAdmin && (
            <Button variant="outline" onClick={() => setImportOpen(true)}>
              <UploadCloud className="h-4 w-4" />
              Import dari ERP
            </Button>
          )
        }
      />

      <Card className="p-4">
        <LifecycleStepper counts={stageCounts} active={params.lifecycleStage} onToggle={toggleStage} />
      </Card>

      <Card>
        <div className="flex flex-wrap items-center gap-2 border-b border-border p-4">
          <button
            type="button"
            onClick={() => setTab('all')}
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${tab === 'all' ? 'bg-primary text-white' : 'text-text-muted hover:bg-surface-2'}`}
          >
            Semua
          </button>
          <button
            type="button"
            onClick={() => setTab('unmatched')}
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${tab === 'unmatched' ? 'bg-warning text-white' : 'text-text-muted hover:bg-surface-2'}`}
          >
            Antrian Belum Terhubung
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-3 border-b border-border p-4">
          <SearchInput
            value={params.search ?? ''}
            onChange={(search) => setParams((p) => ({ ...p, search, page: 1 }))}
            placeholder="Cari No. Notification / Order / Deskripsi..."
          />
          <input
            type="date"
            value={params.dateFrom ?? ''}
            onChange={(e) => setParams((p) => ({ ...p, dateFrom: e.target.value || undefined, page: 1 }))}
            className="h-9 rounded-md border border-border bg-surface px-3 text-sm text-text"
            aria-label="Dari tanggal (Basic Start Date)"
          />
          <input
            type="date"
            value={params.dateTo ?? ''}
            onChange={(e) => setParams((p) => ({ ...p, dateTo: e.target.value || undefined, page: 1 }))}
            className="h-9 rounded-md border border-border bg-surface px-3 text-sm text-text"
            aria-label="Sampai tanggal (Basic Start Date)"
          />
          {hasActiveFilter && (
            <Button variant="ghost" className="text-text-muted" onClick={() => setParams(DEFAULT_PARAMS)}>
              <RotateCcw className="h-4 w-4" />
              Reset
            </Button>
          )}
        </div>

        <div className="overflow-x-auto">
          <WorkOrderTable rows={data?.data ?? []} isLoading={isLoading} onView={(row) => setViewingId(row.id)} />
        </div>

        {data?.meta && <Pagination meta={data.meta} onPageChange={(page) => setParams((p) => ({ ...p, page }))} />}
      </Card>

      <WorkOrderDetailDialog workOrderId={viewingId} onOpenChange={(open) => !open && setViewingId(null)} />

      <WorkOrderImportDialog open={importOpen} onOpenChange={setImportOpen} />
    </div>
  );
}
