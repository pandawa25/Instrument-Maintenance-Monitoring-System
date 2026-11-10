import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Card } from '@/components/ui/card';
import { useChartColors } from '../hooks/use-chart-colors';
import type { TrendPoint } from '../types/dashboard.types';

interface Props {
  title: string;
  label: string; // label metric aktif, dipakai di tooltip
  data: TrendPoint[] | undefined;
  isLoading: boolean;
  accentColor?: string; // warna garis/area, default primary
}

function dayLabel(dateStr: string): string {
  return new Date(`${dateStr}T00:00:00`).toLocaleDateString('id-ID', { day: '2-digit', month: 'short' });
}

// "Grafik Performa" — tren harian 1 metric yang sedang aktif (hasil klik kotak
// summary di atasnya). Area chart dipilih karena sederhana dibaca untuk 1 seri.
export function TrendChart({ title, label, data, isLoading, accentColor }: Props) {
  const colors = useChartColors();
  const lineColor = accentColor ?? colors.primary;

  return (
    <Card className="p-4">
      <h3 className="mb-3 text-sm font-semibold text-text">{title}</h3>
      {isLoading || !data ? (
        <div className="h-[280px] w-full animate-pulse rounded-lg bg-surface-2" />
      ) : data.length === 0 ? (
        <div className="flex h-[280px] items-center justify-center text-sm text-text-muted">Belum ada data.</div>
      ) : (
        <ResponsiveContainer width="100%" height={280}>
          <AreaChart data={data.map((d) => ({ ...d, label: dayLabel(d.date) }))}>
            <defs>
              <linearGradient id="trendFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={lineColor} stopOpacity={0.25} />
                <stop offset="100%" stopColor={lineColor} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke={colors.border} vertical={false} />
            <XAxis dataKey="label" tick={{ fontSize: 12, fill: colors['text-muted'] }} axisLine={{ stroke: colors.border }} tickLine={false} />
            <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: colors['text-muted'] }} axisLine={false} tickLine={false} width={32} />
            <Tooltip
              contentStyle={{
                borderRadius: 8,
                border: `1px solid ${colors.border}`,
                fontSize: 12,
                background: 'hsl(var(--surface))',
                color: 'hsl(var(--text))',
              }}
              formatter={(value: number) => [value, label]}
            />
            <Area type="monotone" dataKey="value" stroke={lineColor} strokeWidth={2} fill="url(#trendFill)" />
          </AreaChart>
        </ResponsiveContainer>
      )}
    </Card>
  );
}
