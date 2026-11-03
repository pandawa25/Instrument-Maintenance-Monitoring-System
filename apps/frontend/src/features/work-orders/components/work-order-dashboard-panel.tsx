import { Link, useNavigate } from 'react-router-dom';
import { ClipboardList, Unlink } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { StatusBadge } from '@/components/shared/status-badge';
import { dataRowProps } from '@/components/shared/data-row';
import { useWorkOrderList, useWorkOrderStageCounts } from '../hooks/use-work-orders';
import { LifecycleStepper } from './lifecycle-stepper';
import type { WorkOrderLifecycleStage } from '../types/work-order.types';

const COUNTS_PARAMS = { page: 1, limit: 1 };
const RECENT_PARAMS = { page: 1, limit: 8, sortBy: 'basicStartDate', sortOrder: 'desc' as const };
const UNMATCHED_PARAMS = { page: 1, limit: 8, unmatchedOnly: true };

function fmtDate(value: string | null) {
  return value ? new Date(value).toLocaleDateString('id-ID') : '—';
}

// Tab "Work Order (ERP)" di Dashboard utama — ringkasan distribusi tahap + 2 list yang
// butuh perhatian/terbaru. Sengaja TIDAK menduplikasi filter/pencarian penuh milik halaman
// /work-orders (lihat diskusi desain) — murni ringkasan at-a-glance + jalan pintas ke sana.
export function WorkOrderDashboardPanel() {
  const navigate = useNavigate();
  const { data: stageCounts } = useWorkOrderStageCounts(COUNTS_PARAMS);
  const { data: recent, isLoading: recentLoading } = useWorkOrderList(RECENT_PARAMS);
  const { data: unmatched, isLoading: unmatchedLoading } = useWorkOrderList(UNMATCHED_PARAMS);

  function goToStage(stage: WorkOrderLifecycleStage) {
    navigate('/work-orders', { state: { lifecycleStage: stage } });
  }

  return (
    <div className="space-y-4">
      <Card className="p-4">
        <LifecycleStepper counts={stageCounts} active={undefined} onToggle={goToStage} />
      </Card>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <Card>
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <h3 className="text-sm font-semibold text-text">Work Order Terbaru (ERP)</h3>
            <Link to="/work-orders" className="text-xs font-medium text-primary hover:underline">
              Lihat semua
            </Link>
          </div>
          {recentLoading ? (
            <div className="p-8 text-center text-sm text-text-muted">Memuat data...</div>
          ) : !recent?.data.length ? (
            <div className="p-8 text-center text-sm text-text-muted">
              Belum ada data — import dari ERP lewat halaman Work Order & Notifikasi.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-surface-2 text-left text-xs uppercase tracking-wide text-text-muted">
                    <th className="px-4 py-2 font-medium">Order</th>
                    <th className="px-4 py-2 font-medium">Equipment</th>
                    <th className="px-4 py-2 font-medium">Start Date</th>
                    <th className="px-4 py-2 font-medium">Tahap</th>
                  </tr>
                </thead>
                <tbody>
                  {recent.data.map((wo) => (
                    <tr key={wo.id} {...dataRowProps(() => navigate('/work-orders'))}>
                      <td className="px-4 py-2 font-medium text-text">{wo.orderNo}</td>
                      <td className="px-4 py-2 text-text-muted">{wo.equipment?.tagNumber ?? '—'}</td>
                      <td className="px-4 py-2 text-text-muted">{fmtDate(wo.basicStartDate)}</td>
                      <td className="px-4 py-2">
                        <StatusBadge value={wo.lifecycleStage} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        <Card>
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <h3 className="flex items-center gap-1.5 text-sm font-semibold text-text">
              <Unlink className="h-4 w-4 text-warning" />
              Perlu Perhatian — Belum Terhubung Equipment
            </h3>
            <button
              type="button"
              onClick={() => navigate('/work-orders', { state: { tab: 'unmatched' } })}
              className="text-xs font-medium text-primary hover:underline"
            >
              Lihat semua
            </button>
          </div>
          {unmatchedLoading ? (
            <div className="p-8 text-center text-sm text-text-muted">Memuat data...</div>
          ) : !unmatched?.data.length ? (
            <div className="p-8 text-center text-sm text-success">Semua Work Order sudah terhubung ke Equipment.</div>
          ) : (
            <ul className="divide-y divide-border">
              {unmatched.data.map((wo) => (
                <li
                  key={wo.id}
                  className="flex cursor-pointer items-center justify-between gap-3 px-4 py-2.5 text-sm hover:bg-surface-2/60"
                  onClick={() => navigate('/work-orders', { state: { tab: 'unmatched' } })}
                >
                  <div className="min-w-0">
                    <p className="font-medium text-text">{wo.orderNo}</p>
                    <p className="truncate text-xs text-text-muted">{wo.equipmentTagRaw || wo.description}</p>
                  </div>
                  <span className="shrink-0 text-xs text-text-muted">{fmtDate(wo.basicStartDate)}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}

export const workOrderDashboardIcon = ClipboardList;
