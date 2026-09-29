import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Legend,
} from 'recharts';
import type {
  MaintenanceByArea,
  MaintenanceByFailureCategory,
  MaintenanceByMonth,
  PmCompliance,
} from '../types/dashboard.types';

// Palet warna brand IMMS (lihat project brief) — dipakai konsisten di semua chart
// supaya tidak tercampur warna generik recharts.
const COLORS = {
  primary: '#005BAC',
  secondary: '#00AEEF',
  success: '#16A34A',
  warning: '#F59E0B',
  danger: '#DC2626',
};
const CATEGORY_PALETTE = [COLORS.primary, COLORS.secondary, COLORS.warning, COLORS.danger, COLORS.success, '#7C3AED', '#0D9488'];

const FAILURE_CATEGORY_LABEL: Record<string, string> = {
  INSTRUMENT: 'Instrument',
  ELECTRICAL: 'Electrical',
  MECHANICAL: 'Mechanical',
  COMMUNICATION: 'Communication',
  CONFIGURATION: 'Configuration',
  CALIBRATION: 'Calibration',
  PROCESS: 'Process',
};

function monthLabel(monthKey: string): string {
  const [year, month] = monthKey.split('-').map(Number);
  return new Date(year, month - 1, 1).toLocaleDateString('id-ID', { month: 'short', year: '2-digit' });
}

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border/70 bg-surface p-4 shadow-sm">
      <h3 className="mb-3 text-sm font-semibold text-text">{title}</h3>
      {children}
    </div>
  );
}

export function MaintenanceTrendChart({ data, isLoading }: { data?: MaintenanceByMonth[]; isLoading: boolean }) {
  return (
    <ChartCard title="Corrective Maintenance per Bulan (12 Bulan Terakhir)">
      {isLoading || !data ? (
        <ChartSkeleton />
      ) : (
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={data.map((d) => ({ ...d, label: monthLabel(d.month) }))}>
            <CartesianGrid strokeDasharray="3 3" stroke="#DDE4EC" vertical={false} />
            <XAxis dataKey="label" tick={{ fontSize: 12, fill: '#5B6B7D' }} axisLine={{ stroke: '#DDE4EC' }} tickLine={false} />
            <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: '#5B6B7D' }} axisLine={false} tickLine={false} width={28} />
            <Tooltip
              contentStyle={{ borderRadius: 8, border: '1px solid #DDE4EC', fontSize: 12 }}
              formatter={(value: number) => [value, 'Maintenance']}
            />
            <Bar dataKey="count" fill={COLORS.primary} radius={[4, 4, 0, 0]} maxBarSize={28} />
          </BarChart>
        </ResponsiveContainer>
      )}
    </ChartCard>
  );
}

export function MaintenanceByAreaChart({ data, isLoading }: { data?: MaintenanceByArea[]; isLoading: boolean }) {
  const chartData = (data ?? []).slice(0, 10).map((d) => ({ ...d, label: d.areaCode }));

  return (
    <ChartCard title="Maintenance by Area">
      {isLoading ? (
        <ChartSkeleton />
      ) : chartData.length === 0 ? (
        <EmptyState />
      ) : (
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={chartData} layout="vertical" margin={{ left: 8 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#DDE4EC" horizontal={false} />
            <XAxis type="number" allowDecimals={false} tick={{ fontSize: 12, fill: '#5B6B7D' }} axisLine={false} tickLine={false} />
            <YAxis
              type="category"
              dataKey="label"
              tick={{ fontSize: 12, fill: '#152233' }}
              axisLine={false}
              tickLine={false}
              width={70}
            />
            <Tooltip
              contentStyle={{ borderRadius: 8, border: '1px solid #DDE4EC', fontSize: 12 }}
              formatter={(value: number, _name, item) => [value, item.payload.areaName]}
            />
            <Bar dataKey="count" fill={COLORS.secondary} radius={[0, 4, 4, 0]} maxBarSize={18} />
          </BarChart>
        </ResponsiveContainer>
      )}
    </ChartCard>
  );
}

export function MaintenanceByCategoryChart({
  data,
  isLoading,
}: {
  data?: MaintenanceByFailureCategory[];
  isLoading: boolean;
}) {
  const chartData = (data ?? []).map((d) => ({ name: FAILURE_CATEGORY_LABEL[d.category] ?? d.category, value: d.count }));
  const total = chartData.reduce((sum, d) => sum + d.value, 0);

  return (
    <ChartCard title="Maintenance by Failure Category">
      {isLoading ? (
        <ChartSkeleton />
      ) : total === 0 ? (
        <EmptyState />
      ) : (
        <ResponsiveContainer width="100%" height={260}>
          <PieChart>
            <Pie data={chartData} dataKey="value" nameKey="name" innerRadius={55} outerRadius={85} paddingAngle={2}>
              {chartData.map((_, index) => (
                <Cell key={index} fill={CATEGORY_PALETTE[index % CATEGORY_PALETTE.length]} />
              ))}
            </Pie>
            <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #DDE4EC', fontSize: 12 }} />
            <Legend wrapperStyle={{ fontSize: 12 }} />
          </PieChart>
        </ResponsiveContainer>
      )}
    </ChartCard>
  );
}

export function PmComplianceChart({ data, isLoading }: { data?: PmCompliance; isLoading: boolean }) {
  const chartData = data
    ? [
        { name: 'Completed', value: data.completed, color: COLORS.success },
        { name: 'Pending (belum jatuh tempo)', value: data.pendingOnTime, color: COLORS.warning },
        { name: 'Overdue', value: data.overdue, color: COLORS.danger },
      ]
    : [];
  const total = chartData.reduce((sum, d) => sum + d.value, 0);

  return (
    <ChartCard title="PM Compliance">
      {isLoading ? (
        <ChartSkeleton />
      ) : total === 0 ? (
        <EmptyState />
      ) : (
        <ResponsiveContainer width="100%" height={260}>
          <PieChart>
            <Pie data={chartData} dataKey="value" nameKey="name" innerRadius={55} outerRadius={85} paddingAngle={2}>
              {chartData.map((entry, index) => (
                <Cell key={index} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #DDE4EC', fontSize: 12 }} />
            <Legend wrapperStyle={{ fontSize: 12 }} />
          </PieChart>
        </ResponsiveContainer>
      )}
    </ChartCard>
  );
}

function ChartSkeleton() {
  return <div className="h-[260px] w-full animate-pulse rounded-lg bg-surface-2" />;
}

function EmptyState() {
  return <div className="flex h-[260px] items-center justify-center text-sm text-text-muted">Belum ada data.</div>;
}
