import { useState } from 'react';
import { ArrowDownToLine, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SearchInput } from '@/components/shared/search-input';
import { Pagination } from '@/components/shared/pagination';
import { PageHeader } from '@/components/shared/page-header';
import { useStockIn } from '../hooks/use-spare-parts';
import { StockMovementListTable } from '../components/stock-movement-list-table';
import { StockMovementFormDialog } from '../components/stock-movement-form-dialog';
import { useAuthStore } from '@/store/auth.store';
import type { AllStockMovementsQueryParams } from '../types/spare-part.types';

const DEFAULT_PARAMS: AllStockMovementsQueryParams = { page: 1, limit: 20, search: '', dateFrom: '', dateTo: '' };

export function StockInPage() {
  const role = useAuthStore((s) => s.user?.role);
  const canEdit = role === 'Admin';

  const [params, setParams] = useState<AllStockMovementsQueryParams>(DEFAULT_PARAMS);
  const [formOpen, setFormOpen] = useState(false);

  const { data, isLoading } = useStockIn({
    ...params,
    dateFrom: params.dateFrom || undefined,
    dateTo: params.dateTo || undefined,
  });

  return (
    <div className="space-y-4">
      <PageHeader
        icon={ArrowDownToLine}
        title="Stock In"
        description="Riwayat penambahan stock spare part / material (restock)."
        action={
          canEdit && (
            <Button onClick={() => setFormOpen(true)}>
              <Plus className="h-4 w-4" />
              Tambah Stock In
            </Button>
          )
        }
      />

      <Card>
        <div className="flex flex-wrap items-end gap-3 border-b border-border p-4">
          <SearchInput
            value={params.search ?? ''}
            onChange={(search) => setParams((p) => ({ ...p, search, page: 1 }))}
            placeholder="Cari KIMAP / nama material..."
          />
          <div>
            <Label htmlFor="dateFrom" className="text-xs">
              Dari Tanggal
            </Label>
            <Input
              id="dateFrom"
              type="date"
              className="w-40"
              value={params.dateFrom}
              onChange={(e) => setParams((p) => ({ ...p, dateFrom: e.target.value, page: 1 }))}
            />
          </div>
          <div>
            <Label htmlFor="dateTo" className="text-xs">
              Sampai Tanggal
            </Label>
            <Input
              id="dateTo"
              type="date"
              className="w-40"
              value={params.dateTo}
              onChange={(e) => setParams((p) => ({ ...p, dateTo: e.target.value, page: 1 }))}
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <StockMovementListTable items={data?.data ?? []} isLoading={isLoading} type="RESTOCK" />
        </div>

        {data?.meta && <Pagination meta={data.meta} onPageChange={(page) => setParams((p) => ({ ...p, page }))} />}
      </Card>

      <StockMovementFormDialog open={formOpen} onOpenChange={setFormOpen} type="RESTOCK" />
    </div>
  );
}
