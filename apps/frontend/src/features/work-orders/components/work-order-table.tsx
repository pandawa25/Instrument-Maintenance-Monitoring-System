import { ClipboardList, LinkIcon, Unlink } from 'lucide-react';
import { StatusBadge } from '@/components/shared/status-badge';
import { LoadingState } from '@/components/shared/loading-state';
import { EmptyState } from '@/components/shared/empty-state';
import { dataRowProps } from '@/components/shared/data-row';
import { SortableTh } from '@/components/shared/sortable-th';
import type { WorkOrder } from '../types/work-order.types';

function fmtDate(value: string | null) {
  return value ? new Date(value).toLocaleDateString('id-ID') : '—';
}

export type WorkOrderSortableField = 'basicStartDate' | 'basicFinDate';

interface Props {
  rows: WorkOrder[];
  isLoading: boolean;
  onView: (row: WorkOrder) => void;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  onSort: (field: WorkOrderSortableField) => void;
}

// Kolom sesuai docs/design-notification-work-order.md §3/§9 (10 field) — Start/Finish Date
// ditaruh paling kiri (kolom paling sering dipakai untuk menyortir pekerjaan), disusul
// Notification, lalu identitas & status lainnya. Kolom Equipment menampilkan badge "Belum
// Terhubung" kalau equipmentId null — baris itu juga ada di tab "Antrian Belum Terhubung".
export function WorkOrderTable({ rows, isLoading, onView, sortBy, sortOrder, onSort }: Props) {
  if (isLoading) return <LoadingState />;
  if (rows.length === 0) {
    return <EmptyState icon={ClipboardList} message="Belum ada data Work Order — import dari export ERP terlebih dahulu." />;
  }

  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="border-b border-border text-left text-xs font-medium uppercase tracking-wide text-text-muted">
          <SortableTh label="Start Date" field="basicStartDate" sortBy={sortBy} sortOrder={sortOrder} onSort={onSort} />
          <SortableTh label="Finish Date" field="basicFinDate" sortBy={sortBy} sortOrder={sortOrder} onSort={onSort} />
          <th className="px-4 py-2.5">Notification</th>
          <th className="px-4 py-2.5">Order</th>
          <th className="px-4 py-2.5">Deskripsi</th>
          <th className="px-4 py-2.5">Equipment</th>
          <th className="px-4 py-2.5">Functional Loc.</th>
          <th className="px-4 py-2.5">Order Type</th>
          <th className="px-4 py-2.5">User Status</th>
          <th className="px-4 py-2.5">System Status</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr key={row.id} {...dataRowProps(() => onView(row))}>
            <td className="px-4 py-2.5 text-text-muted">{fmtDate(row.basicStartDate)}</td>
            <td className="px-4 py-2.5 text-text-muted">{fmtDate(row.basicFinDate)}</td>
            <td className="px-4 py-2.5 text-text-muted">{row.notification?.notificationNo ?? '—'}</td>
            <td className="px-4 py-2.5 font-medium text-text">{row.orderNo}</td>
            <td className="max-w-[220px] truncate px-4 py-2.5" title={row.description}>
              {row.description}
            </td>
            <td className="px-4 py-2.5">
              {row.equipment ? (
                <span className="inline-flex items-center gap-1">
                  <LinkIcon className="h-3 w-3 text-success" />
                  {row.equipment.tagNumber}
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-warning">
                  <Unlink className="h-3 w-3" />
                  {row.equipmentTagRaw || 'Belum Terhubung'}
                </span>
              )}
            </td>
            <td className="px-4 py-2.5 text-text-muted">{row.functionalLocation ?? '—'}</td>
            <td className="px-4 py-2.5 text-text-muted">{row.orderType ?? '—'}</td>
            <td className="px-4 py-2.5 text-text-muted">{row.userStatus ?? '—'}</td>
            <td className="px-4 py-2.5">
              <StatusBadge value={row.lifecycleStage} />
              {row.systemStatus && <span className="ml-1.5 text-[11px] text-text-muted">{row.systemStatus}</span>}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
