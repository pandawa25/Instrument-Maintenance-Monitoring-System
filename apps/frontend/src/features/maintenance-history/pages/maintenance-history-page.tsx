import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { History, SearchX } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { PageHeader } from '@/components/shared/page-header';
import { LoadingState } from '@/components/shared/loading-state';
import { EmptyState } from '@/components/shared/empty-state';
import { getErrorMessage } from '@/lib/axios';
import { useEquipmentHistory } from '../hooks/use-maintenance-history';
import { EquipmentSearchPanel } from '../components/equipment-search-panel';
import { EquipmentHeaderCard } from '../components/equipment-header-card';
import { HistorySummaryCards } from '../components/history-summary-cards';
import { MaterialUsageCard } from '../components/material-usage-card';
import { HistoryFilters, DEFAULT_HISTORY_FILTERS, isFiltered } from '../components/history-filters';
import { HistoryTimeline } from '../components/history-timeline';
import type { HistoryFilters as Filters } from '../types/maintenance-history.types';

// Dua tampilan dalam satu halaman, dibedakan oleh ?equipmentId= di URL:
//  - tanpa parameter  -> pencarian tag number (halaman awal)
//  - dengan parameter -> history equipment tsb
// Pakai URL (bukan state lokal) supaya tombol Back browser kembali ke pencarian dan hasilnya bisa di-bookmark/dibagikan.
export function MaintenanceHistoryPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const equipmentId = searchParams.get('equipmentId');
  const [filters, setFilters] = useState<Filters>(DEFAULT_HISTORY_FILTERS);

  const { data, isLoading, isError, error } = useEquipmentHistory(equipmentId, filters);

  function show(id: string) {
    setFilters(DEFAULT_HISTORY_FILTERS);
    setSearchParams({ equipmentId: id });
  }

  function backToSearch() {
    setFilters(DEFAULT_HISTORY_FILTERS);
    setSearchParams({});
  }

  return (
    <div className="space-y-4">
      <PageHeader
        icon={History}
        title="History Maintenance"
        description="Riwayat kegiatan maintenance (corrective & preventive) beserta pemakaian material per equipment."
      />

      {!equipmentId && <EquipmentSearchPanel onShow={show} />}

      {equipmentId && isLoading && (
        <Card>
          <LoadingState message="Memuat history maintenance..." />
        </Card>
      )}

      {equipmentId && isError && (
        <Card>
          <EmptyState icon={SearchX} message={getErrorMessage(error, 'Gagal memuat history equipment.')} />
          <div className="flex justify-center pb-6">
            <Button variant="outline" onClick={backToSearch}>
              Cari equipment lain
            </Button>
          </div>
        </Card>
      )}

      {equipmentId && data && (
        <>
          <EquipmentHeaderCard equipment={data.equipment} onChange={backToSearch} />
          <HistoryFilters value={filters} onChange={setFilters} />
          <HistorySummaryCards summary={data.summary} />
          <MaterialUsageCard usage={data.summary.materialUsage} />
          <HistoryTimeline events={data.events} filtered={isFiltered(filters)} />
        </>
      )}
    </div>
  );
}
