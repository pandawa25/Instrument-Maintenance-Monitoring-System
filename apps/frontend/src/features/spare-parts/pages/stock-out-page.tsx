import { useState } from 'react';
import { ArrowUpFromLine, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { SearchInput } from '@/components/shared/search-input';
import { Pagination } from '@/components/shared/pagination';
import { PageHeader } from '@/components/shared/page-header';
import { useStockOut } from '../hooks/use-spare-parts';
import { StockMovementListTable } from '../components/stock-movement-list-table';
import { StockMovementFormDialog } from '../components/stock-movement-form-dialog';
import { usePermission } from '@/store/auth.store';
import type { AllStockMovementsQueryParams, StockOutSource } from '../types/spare-part.types';

const DEFAULT_PARAMS: AllStockMovementsQueryParams = {
  page: 1,
  limit: 20,
  search: '',
  source: 'ALL',
  dateFrom: '',
  dateTo: '',
};

const SOURCE_OPTIONS: { value: StockOutSource; label: string }[] = [
  { value: 'ALL', label: 'Semua sumber' },
  { value: 'MANUAL', label: 'Manual' },
  { value: 'MAINTENANCE', label: 'Pemakaian Corrective Maintenance' },
];

export function StockOutPage() {
  const canEdit = usePermission('SPARE_PART', 'edit');

  const [params, setParams] = useState<AllStockMovementsQueryParams>(DEFAULT_PARAMS);
  const [formOpen, setFormOpen] = useState(false);

  const { data, isLoading } = useStockOut({
    ...params,
    dateFrom: params.dateFrom || undefined,
    dateTo: params.dateTo || undefined,
  });

  return (
    <div className="space-y-4">
      <PageHeader
        icon={ArrowUpFromLine}
        title="Stock Out"
        description="Riwayat pengeluaran stock: input manual dan pemakaian material pada Corrective Maintenance yang sudah Completed."
        action={
          canEdit && (
            <Button onClick={() => setFormOpen(true)}>
              <Plus className="h-4 w-4" />
              Tambah Stock Out
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
            <Label htmlFor="source" className="text-xs">
              Sumber
            </Label>
            <Select
              id="source"
              className="w-60"
              value={params.source ?? 'ALL'}
              onChange={(e) => setParams((p) => ({ ...p, source: e.target.value as StockOutSource, page: 1 }))}
            >
              {SOURCE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor="dateFrom" className="text-xs">
              Tanggal Transaksi — Dari
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
              Sampai
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
          <StockMovementListTable items={data?.data ?? []} isLoading={isLoading} type="STOCK_OUT" />
        </div>

        {data?.meta && <Pagination meta={data.meta} onPageChange={(page) => setParams((p) => ({ ...p, page }))} />}
      </Card>

      <StockMovementFormDialog open={formOpen} onOpenChange={setFormOpen} type="STOCK_OUT" />
    </div>
  );
}
