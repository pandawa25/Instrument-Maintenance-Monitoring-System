import { Package } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { formatNumber } from '../utils/format';
import type { MaterialUsageSummary } from '../types/maintenance-history.types';

// Rekap seluruh material yang benar-benar terpakai (dari Corrective yang Completed) pada equipment ini.
export function MaterialUsageCard({ usage }: { usage: MaterialUsageSummary[] }) {
  return (
    <Card>
      <div className="flex items-center gap-2 border-b border-border px-4 py-3">
        <Package className="h-4 w-4 text-primary" />
        <h4 className="text-sm font-semibold text-text">Rekap Pemakaian Material / Spare Part</h4>
      </div>

      {usage.length === 0 ? (
        <p className="px-4 py-6 text-center text-sm text-text-muted">
          Belum ada pemakaian material yang tercatat pada rentang ini.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-text-muted">
                <th className="px-4 py-2 font-medium">Kimap</th>
                <th className="px-4 py-2 font-medium">Material</th>
                <th className="px-4 py-2 text-right font-medium">Total Terpakai</th>
                <th className="px-4 py-2 text-right font-medium">Kali Dipakai</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {usage.map((u) => (
                <tr key={u.sparePartId}>
                  <td className="whitespace-nowrap px-4 py-2 font-mono text-xs text-text">{u.kimap}</td>
                  <td className="px-4 py-2 text-text">{u.name}</td>
                  <td className="whitespace-nowrap px-4 py-2 text-right font-medium text-text">
                    {formatNumber(u.totalQuantity)} {u.unit}
                  </td>
                  <td className="px-4 py-2 text-right text-text-muted">{u.usageCount}×</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}
