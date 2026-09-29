import { Link } from 'react-router-dom';
import { StatusBadge } from '@/components/shared/status-badge';
import type { LatestMaintenanceItem, UpcomingPmPeriod } from '../types/dashboard.types';

const FAILURE_CATEGORY_LABEL: Record<string, string> = {
  INSTRUMENT: 'Instrument',
  ELECTRICAL: 'Electrical',
  MECHANICAL: 'Mechanical',
  COMMUNICATION: 'Communication',
  CONFIGURATION: 'Configuration',
  CALIBRATION: 'Calibration',
  PROCESS: 'Process',
};

export function LatestMaintenanceTable({ items, isLoading }: { items?: LatestMaintenanceItem[]; isLoading: boolean }) {
  return (
    <div className="rounded-xl border border-border/70 bg-surface shadow-sm">
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <h3 className="text-sm font-semibold text-text">10 Corrective Maintenance Terbaru</h3>
        <Link to="/maintenance" className="text-xs font-medium text-primary hover:underline">
          Lihat semua
        </Link>
      </div>

      {isLoading ? (
        <div className="p-8 text-center text-sm text-text-muted">Memuat data...</div>
      ) : !items || items.length === 0 ? (
        <div className="p-8 text-center text-sm text-text-muted">Belum ada data corrective maintenance.</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-surface-2 text-left text-xs uppercase tracking-wide text-text-muted">
                <th className="px-4 py-2 font-medium">Tanggal</th>
                <th className="px-4 py-2 font-medium">Tag Number</th>
                <th className="px-4 py-2 font-medium">Area</th>
                <th className="px-4 py-2 font-medium">Kategori</th>
                <th className="px-4 py-2 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id} className="border-b border-border last:border-0 hover:bg-surface-2/60">
                  <td className="px-4 py-2 text-text-muted">{new Date(item.maintenanceDate).toLocaleDateString('id-ID')}</td>
                  <td className="px-4 py-2 font-mono text-xs text-text">{item.equipment.tagNumber}</td>
                  <td className="px-4 py-2 text-text-muted">{item.areaCode}</td>
                  <td className="px-4 py-2 text-text-muted">{FAILURE_CATEGORY_LABEL[item.failureCategory] ?? item.failureCategory}</td>
                  <td className="px-4 py-2">
                    <StatusBadge value={item.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export function UpcomingPmList({ items, isLoading }: { items?: UpcomingPmPeriod[]; isLoading: boolean }) {
  return (
    <div className="rounded-xl border border-border/70 bg-surface shadow-sm">
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <h3 className="text-sm font-semibold text-text">PM Mendatang / Overdue</h3>
        <Link to="/pm-programs" className="text-xs font-medium text-primary hover:underline">
          Lihat semua
        </Link>
      </div>

      {isLoading ? (
        <div className="p-8 text-center text-sm text-text-muted">Memuat data...</div>
      ) : !items || items.length === 0 ? (
        <div className="p-8 text-center text-sm text-text-muted">Tidak ada PM yang pending saat ini.</div>
      ) : (
        <ul className="divide-y divide-border">
          {items.map((item) => (
            <li key={item.id} className="px-4 py-3">
              <Link to={`/pm-programs/${item.programId}`} className="flex items-center justify-between gap-3 hover:opacity-80">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-text">
                    {item.programName} — Periode {item.periodNumber}
                  </p>
                  <p className="text-xs text-text-muted">
                    {item.vendorName} &bull; Rencana {new Date(item.plannedDate).toLocaleDateString('id-ID')} &bull;{' '}
                    {item.completedEquipment}/{item.totalEquipment} equipment selesai
                  </p>
                </div>
                <StatusBadge value={item.status} />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
