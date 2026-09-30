import { useMemo, useState } from 'react';
import { Timer, Activity, ShieldCheck } from 'lucide-react';
import { Select } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { useDashboardKpi } from '../hooks/use-dashboard';
import type { KpiByArea, KpiByInstrument, KpiMetrics } from '../types/dashboard.types';

const MONTH_OPTIONS = [3, 6, 12, 24];

function fmt(value: number | null, suffix: string): string {
  return value === null ? '—' : `${value}${suffix}`;
}

function KpiCard({ label, value, icon: Icon, accent, hint }: { label: string; value: string; icon: typeof Timer; accent: string; hint: string }) {
  return (
    <div className="rounded-xl border border-border/70 bg-surface p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium uppercase tracking-wide text-text-muted">{label}</span>
        <Icon className={cn('h-4 w-4 shrink-0', accent)} />
      </div>
      <div className="mt-2 text-2xl font-semibold text-text">{value}</div>
      <p className="mt-1 text-[11px] text-text-muted">{hint}</p>
    </div>
  );
}

function OverallCards({ overall, isLoading }: { overall: KpiMetrics | undefined; isLoading: boolean }) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-24 animate-pulse rounded-xl border border-border/70 bg-surface-2" />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      <KpiCard
        label="MTTR"
        value={fmt(overall?.mttr ?? null, ' jam')}
        icon={Timer}
        accent="text-warning"
        hint={`Rata-rata waktu perbaikan (${overall?.totalFailures ?? 0} kejadian)`}
      />
      <KpiCard
        label="MTBF"
        value={fmt(overall?.mtbf ?? null, ' hari')}
        icon={Activity}
        accent="text-secondary"
        hint="Rata-rata interval antar kegagalan"
      />
      <KpiCard
        label="PM Compliance Rate"
        value={fmt(overall?.pmComplianceRate ?? null, '%')}
        icon={ShieldCheck}
        accent="text-success"
        hint={`Dari ${overall?.totalPmScheduled ?? 0} PM terjadwal`}
      />
    </div>
  );
}

function ByAreaTable({ rows, isLoading }: { rows?: KpiByArea[]; isLoading: boolean }) {
  return (
    <div className="rounded-xl border border-border/70 bg-surface shadow-sm">
      <div className="border-b border-border px-4 py-3">
        <h3 className="text-sm font-semibold text-text">KPI per Area</h3>
      </div>
      {isLoading ? (
        <div className="p-8 text-center text-sm text-text-muted">Memuat data...</div>
      ) : !rows || rows.length === 0 ? (
        <div className="p-8 text-center text-sm text-text-muted">Belum ada data untuk periode ini.</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-surface-2 text-left text-xs uppercase tracking-wide text-text-muted">
                <th className="px-4 py-2 font-medium">Area</th>
                <th className="px-4 py-2 font-medium">MTTR (jam)</th>
                <th className="px-4 py-2 font-medium">MTBF (hari)</th>
                <th className="px-4 py-2 font-medium">PM Compliance</th>
                <th className="px-4 py-2 font-medium">Total Gagal</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.areaCode} className="border-b border-border last:border-0 hover:bg-surface-2/60">
                  <td className="px-4 py-2 text-text">
                    {row.areaCode} <span className="text-text-muted">— {row.areaName}</span>
                  </td>
                  <td className="px-4 py-2 text-text-muted">{fmt(row.mttr, '')}</td>
                  <td className="px-4 py-2 text-text-muted">{fmt(row.mtbf, '')}</td>
                  <td className="px-4 py-2 text-text-muted">{fmt(row.pmComplianceRate, '%')}</td>
                  <td className="px-4 py-2 text-text-muted">{row.totalFailures}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function ByInstrumentTable({ rows, isLoading }: { rows?: KpiByInstrument[]; isLoading: boolean }) {
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    if (!rows) return [];
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) => r.tagNumber.toLowerCase().includes(q) || (r.service ?? '').toLowerCase().includes(q));
  }, [rows, search]);

  return (
    <div className="rounded-xl border border-border/70 bg-surface shadow-sm">
      <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
        <h3 className="text-sm font-semibold text-text">KPI per Instrument</h3>
        <Input
          className="h-8 w-48"
          placeholder="Cari Tag Number..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>
      {isLoading ? (
        <div className="p-8 text-center text-sm text-text-muted">Memuat data...</div>
      ) : !rows || rows.length === 0 ? (
        <div className="p-8 text-center text-sm text-text-muted">Belum ada data untuk periode ini.</div>
      ) : filtered.length === 0 ? (
        <div className="p-8 text-center text-sm text-text-muted">Tidak ada instrument yang cocok.</div>
      ) : (
        <div className="max-h-96 overflow-y-auto overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-surface-2">
              <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-text-muted">
                <th className="px-4 py-2 font-medium">Tag Number</th>
                <th className="px-4 py-2 font-medium">MTTR (jam)</th>
                <th className="px-4 py-2 font-medium">MTBF (hari)</th>
                <th className="px-4 py-2 font-medium">PM Compliance</th>
                <th className="px-4 py-2 font-medium">Total Gagal</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((row) => (
                <tr key={row.tagNumber} className="border-b border-border last:border-0 hover:bg-surface-2/60">
                  <td className="px-4 py-2 font-mono text-xs text-text">
                    {row.tagNumber} <span className="font-sans text-text-muted">— {row.service}</span>
                  </td>
                  <td className="px-4 py-2 text-text-muted">{fmt(row.mttr, '')}</td>
                  <td className="px-4 py-2 text-text-muted">{fmt(row.mtbf, '')}</td>
                  <td className="px-4 py-2 text-text-muted">{fmt(row.pmComplianceRate, '%')}</td>
                  <td className="px-4 py-2 text-text-muted">{row.totalFailures}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export function KpiSection() {
  const [months, setMonths] = useState(12);
  const { data, isLoading } = useDashboardKpi(months);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-text">KPI Maintenance</h3>
          <p className="text-xs text-text-muted">MTTR, MTBF, dan PM Compliance Rate untuk periode terpilih.</p>
        </div>
        <Select className="w-40" value={months} onChange={(e) => setMonths(Number(e.target.value))}>
          {MONTH_OPTIONS.map((m) => (
            <option key={m} value={m}>
              {m} bulan terakhir
            </option>
          ))}
        </Select>
      </div>

      <OverallCards overall={data?.overall} isLoading={isLoading} />

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <ByAreaTable rows={data?.byArea} isLoading={isLoading} />
        <ByInstrumentTable rows={data?.byInstrument} isLoading={isLoading} />
      </div>
    </div>
  );
}
