import { useMemo, useState } from 'react';
import { StatusBadge } from '@/components/shared/status-badge';
import { Input } from '@/components/ui/input';
import { useDashboardHealthIndex } from '../hooks/use-dashboard';
import type { HealthCategory } from '../types/dashboard.types';

const SUMMARY_ORDER: { key: keyof ReturnType<typeof zeroSummary>; label: string; category: HealthCategory }[] = [
  { key: 'good', label: 'Good', category: 'GOOD' },
  { key: 'fair', label: 'Fair', category: 'FAIR' },
  { key: 'poor', label: 'Poor', category: 'POOR' },
  { key: 'critical', label: 'Critical', category: 'CRITICAL' },
  { key: 'insufficientData', label: 'Belum Cukup Data', category: 'INSUFFICIENT_DATA' },
];

function zeroSummary() {
  return { good: 0, fair: 0, poor: 0, critical: 0, insufficientData: 0 };
}

function fmt(value: number | null, suffix: string): string {
  return value === null ? '—' : `${value}${suffix}`;
}

export function HealthIndexSection() {
  const [months, setMonths] = useState(12);
  const [search, setSearch] = useState('');
  const { data, isLoading } = useDashboardHealthIndex(months);

  const filtered = useMemo(() => {
    if (!data) return [];
    const q = search.trim().toLowerCase();
    if (!q) return data.items;
    return data.items.filter((i) => i.tagNumber.toLowerCase().includes(q) || i.service.toLowerCase().includes(q));
  }, [data, search]);

  const summary = data?.summary ?? zeroSummary();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-text">Instrument Health Index</h3>
          <p className="text-xs text-text-muted">
            Skor komposit 0-100 dari MTTR, MTBF, frekuensi kegagalan (relatif antar instrument), dan criticality — bukan
            perbandingan terhadap standar industri baku.
          </p>
        </div>
        <select
          className="h-9 rounded-md border border-border bg-surface px-3 text-sm text-text"
          value={months}
          onChange={(e) => setMonths(Number(e.target.value))}
        >
          {[3, 6, 12, 24].map((m) => (
            <option key={m} value={m}>
              {m} bulan terakhir
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
        {SUMMARY_ORDER.map((s) => (
          <div key={s.key} className="rounded-xl border border-border/70 bg-surface p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium uppercase tracking-wide text-text-muted">{s.label}</span>
            </div>
            <div className="mt-2 text-2xl font-semibold text-text">
              {isLoading ? <span className="inline-block h-7 w-8 animate-pulse rounded bg-surface-2" /> : summary[s.key]}
            </div>
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-border/70 bg-surface shadow-sm">
        <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
          <h4 className="text-sm font-semibold text-text">Detail per Instrument</h4>
          <Input className="h-8 w-48" placeholder="Cari Tag Number..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>

        {isLoading ? (
          <div className="p-8 text-center text-sm text-text-muted">Memuat data...</div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center text-sm text-text-muted">Tidak ada instrument yang cocok.</div>
        ) : (
          <div className="max-h-96 overflow-y-auto overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-surface-2">
                <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-text-muted">
                  <th className="px-4 py-2 font-medium">Tag Number</th>
                  <th className="px-4 py-2 font-medium">Area</th>
                  <th className="px-4 py-2 font-medium">Criticality</th>
                  <th className="px-4 py-2 font-medium">MTTR</th>
                  <th className="px-4 py-2 font-medium">MTBF</th>
                  <th className="px-4 py-2 font-medium">Total Gagal</th>
                  <th className="px-4 py-2 font-medium">Health Score</th>
                  <th className="px-4 py-2 font-medium">Kategori</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((item) => (
                  <tr key={item.equipmentId} className="border-b border-border last:border-0 hover:bg-surface-2/60">
                    <td className="px-4 py-2 font-mono text-xs text-text">
                      {item.tagNumber} <span className="font-sans text-text-muted">— {item.service}</span>
                    </td>
                    <td className="px-4 py-2 text-text-muted">{item.areaCode}</td>
                    <td className="px-4 py-2">
                      <StatusBadge value={item.criticality} />
                    </td>
                    <td className="px-4 py-2 text-text-muted">{fmt(item.mttr, ' jam')}</td>
                    <td className="px-4 py-2 text-text-muted">{fmt(item.mtbf, ' hari')}</td>
                    <td className="px-4 py-2 text-text-muted">{item.totalFailures}</td>
                    <td className="px-4 py-2 font-medium text-text">{item.healthScore ?? '—'}</td>
                    <td className="px-4 py-2">
                      <StatusBadge value={item.category} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
