import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Card } from '@/components/ui/card';
import { useChartColors } from '@/features/dashboard/hooks/use-chart-colors';
import type { MonthlyStockTrend } from '../types/spare-part.types';

function monthLabel(monthKey: string): string {
  const [year, month] = monthKey.split('-').map(Number);
  return new Date(year, month - 1, 1).toLocaleDateString('id-ID', { month: 'short', year: '2-digit' });
}

interface Props {
  data?: MonthlyStockTrend[];
  isLoading: boolean;
}

export function InventoryTrendChart({ data, isLoading }: Props) {
  const colors = useChartColors();

  return (
    <Card className="p-4">
      <h3 className="mb-3 text-sm font-semibold text-text">Tren Stock In vs Stock Out (6 Bulan Terakhir)</h3>
      {isLoading || !data ? (
        <div className="h-[260px] w-full animate-pulse rounded-lg bg-surface-2" />
      ) : (
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={data.map((d) => ({ ...d, label: monthLabel(d.month) }))}>
            <CartesianGrid strokeDasharray="3 3" stroke={colors.border} vertical={false} />
            <XAxis dataKey="label" tick={{ fontSize: 12, fill: colors['text-muted'] }} axisLine={{ stroke: colors.border }} tickLine={false} />
            <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: colors['text-muted'] }} axisLine={false} tickLine={false} width={32} />
            <Tooltip
              contentStyle={{ borderRadius: 8, border: `1px solid ${colors.border}`, fontSize: 12, background: 'hsl(var(--surface))', color: 'hsl(var(--text))' }}
            />
            <Legend wrapperStyle={{ fontSize: 12, color: colors.text }} />
            <Bar dataKey="stockIn" name="Stock In" fill={colors.success} radius={[4, 4, 0, 0]} maxBarSize={28} />
            <Bar dataKey="stockOut" name="Stock Out" fill={colors.danger} radius={[4, 4, 0, 0]} maxBarSize={28} />
          </BarChart>
        </ResponsiveContainer>
      )}
    </Card>
  );
}
