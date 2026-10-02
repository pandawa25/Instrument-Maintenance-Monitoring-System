import { Boxes, LayoutGrid, PackageCheck, PackageX, TriangleAlert } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { useInventoryCharts, useInventorySummary } from '../hooks/use-spare-parts';
import { InventoryTrendChart } from '../components/inventory-trend-chart';
import { LowStockTable } from '../components/low-stock-table';

export function InventoryDashboardPage() {
  const { data: summary, isLoading: summaryLoading } = useInventorySummary();
  const { data: charts, isLoading: chartsLoading } = useInventoryCharts(6);

  const cards = [
    { label: 'Total Item', value: summary?.totalItems ?? 0, icon: LayoutGrid, accent: 'text-primary' },
    { label: 'Item Aktif', value: summary?.activeItems ?? 0, icon: PackageCheck, accent: 'text-secondary' },
    { label: 'Total Qty Stock', value: summary?.totalStockQty ?? 0, icon: Boxes, accent: 'text-success' },
    { label: 'Low Stock', value: summary?.lowStockCount ?? 0, icon: TriangleAlert, accent: 'text-warning' },
    { label: 'Out of Stock', value: summary?.outOfStockCount ?? 0, icon: PackageX, accent: 'text-danger' },
  ];

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-text">Inventory Dashboard</h2>
        <p className="text-sm text-text-muted">Ringkasan kondisi stock spare part / material terkini.</p>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-5">
        {cards.map((card) => (
          <Card key={card.label} className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium uppercase tracking-wide text-text-muted">{card.label}</span>
              <card.icon className={cn('h-4 w-4 shrink-0', card.accent)} />
            </div>
            <div className="mt-2 text-2xl font-semibold text-text">
              {summaryLoading ? <span className="inline-block h-7 w-12 animate-pulse rounded bg-surface-2" /> : card.value}
            </div>
          </Card>
        ))}
      </div>

      <InventoryTrendChart data={charts?.monthlyTrend} isLoading={chartsLoading} />

      <LowStockTable items={charts?.lowStockItems} isLoading={chartsLoading} />
    </div>
  );
}
