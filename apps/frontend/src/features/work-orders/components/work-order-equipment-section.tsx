import { useState } from 'react';
import { ClipboardList } from 'lucide-react';
import { useWorkOrderList } from '../hooks/use-work-orders';
import { StatusBadge } from '@/components/shared/status-badge';
import { LoadingState } from '@/components/shared/loading-state';
import { WorkOrderDetailDialog } from './work-order-detail-dialog';

interface Props {
  equipmentId: string | undefined;
}

function fmtDate(value: string | null) {
  return value ? new Date(value).toLocaleDateString('id-ID') : '—';
}

// Section "Notifikasi & Work Order (ERP)" di halaman detail Equipment — list ringkas WO
// yang ter-link ke tag ini (hasil import ERP), pola sama dengan DocumentsSection di
// halaman yang sama. Kolom Equipment sengaja dihilangkan (sudah dalam konteks equipment ini).
export function WorkOrderEquipmentSection({ equipmentId }: Props) {
  const [viewingId, setViewingId] = useState<string | null>(null);
  const { data, isLoading } = useWorkOrderList({
    page: 1,
    limit: 50,
    equipmentId,
    sortBy: 'basicStartDate',
    sortOrder: 'desc',
  });

  if (!equipmentId) return null;

  const rows = data?.data ?? [];

  return (
    <div>
      <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-text">
        <ClipboardList className="h-4 w-4 text-primary" />
        Notifikasi &amp; Work Order (ERP)
      </h3>

      {isLoading ? (
        <LoadingState />
      ) : rows.length === 0 ? (
        <p className="text-sm text-text-muted">Belum ada Notification/Work Order ERP yang terhubung ke equipment ini.</p>
      ) : (
        <ul className="divide-y divide-border rounded-lg border border-border">
          {rows.map((wo) => (
            <li
              key={wo.id}
              className="flex cursor-pointer items-center justify-between gap-3 px-3 py-2.5 text-sm hover:bg-surface-2/60"
              onClick={() => setViewingId(wo.id)}
            >
              <div className="min-w-0">
                <p className="font-medium text-text">
                  {wo.orderNo}
                  {wo.notification && <span className="ml-1.5 text-xs text-text-muted">({wo.notification.notificationNo})</span>}
                </p>
                <p className="truncate text-xs text-text-muted">{wo.description}</p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <span className="text-xs text-text-muted">{fmtDate(wo.basicStartDate)}</span>
                <StatusBadge value={wo.lifecycleStage} />
              </div>
            </li>
          ))}
        </ul>
      )}

      <WorkOrderDetailDialog workOrderId={viewingId} onOpenChange={(open) => !open && setViewingId(null)} />
    </div>
  );
}
