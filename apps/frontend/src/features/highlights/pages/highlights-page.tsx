import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CalendarClock, ClipboardList, Star, Wrench } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { toast } from 'sonner';
import { Card } from '@/components/ui/card';
import { PageHeader } from '@/components/shared/page-header';
import { LoadingState } from '@/components/shared/loading-state';
import { EmptyState } from '@/components/shared/empty-state';
import { StatusBadge } from '@/components/shared/status-badge';
import { HighlightToggleButton } from '@/components/shared/highlight-toggle-button';
import { HighlightConfirmDialog } from '@/components/shared/highlight-confirm-dialog';
import { dataRowProps } from '@/components/shared/data-row';
import { getErrorMessage } from '@/lib/axios';
import { notifyHighlightToggled } from '@/lib/highlight-toast';
import { usePermission } from '@/store/auth.store';
import { useHighlights } from '../hooks/use-highlights';
import { useSetMaintenanceHighlighted } from '@/features/maintenance/hooks/use-maintenance';
import { useSetPmPeriodExecutionHighlighted } from '@/features/pm-programs/hooks/use-pm-period-executions';
import { useSetWorkOrderHighlighted } from '@/features/work-orders/hooks/use-work-orders';
import type { HighlightItem, HighlightType } from '../types/highlight.types';

const TYPE_META: Record<HighlightType, { label: string; icon: LucideIcon }> = {
  CORRECTIVE_MAINTENANCE: { label: 'Corrective Maintenance', icon: Wrench },
  PM_EXECUTION: { label: 'Preventive Maintenance', icon: CalendarClock },
  WORK_ORDER: { label: 'Work Order', icon: ClipboardList },
};

function fmtDate(value: string | null) {
  return value ? new Date(value).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
}

// Halaman gabungan 3 sumber (lihat backend HighlightsService) — pekerjaan yang ditandai
// bintang supaya mudah dipantau tanpa harus bolak-balik ke 3 modul berbeda. Klik baris
// membuka halaman/dialog asli modul tsb (linkTo dari backend); klik bintang di sini
// langsung membatalkan highlight tanpa pindah halaman (mirip unstar di bookmark manager).
export function HighlightsPage() {
  const navigate = useNavigate();
  const { data: items, isLoading } = useHighlights();

  const canEditCm = usePermission('CORRECTIVE_MAINTENANCE', 'edit');
  const canEditPm = usePermission('PM_EXECUTION', 'edit');
  const canEditWo = usePermission('WORK_ORDER', 'edit');

  const cmMutation = useSetMaintenanceHighlighted();
  const pmMutation = useSetPmPeriodExecutionHighlighted();
  const woMutation = useSetWorkOrderHighlighted();

  function canEdit(type: HighlightType) {
    if (type === 'CORRECTIVE_MAINTENANCE') return canEditCm;
    if (type === 'PM_EXECUTION') return canEditPm;
    return canEditWo;
  }

  function isToggling(item: HighlightItem) {
    const mutation = item.type === 'CORRECTIVE_MAINTENANCE' ? cmMutation : item.type === 'PM_EXECUTION' ? pmMutation : woMutation;
    return mutation.isPending && mutation.variables?.id === item.id;
  }

  // Halaman ini hanya pernah membatalkan highlight (tidak pernah menandai baru), jadi dialog
  // konfirmasi di sini selalu bertindak sebagai "Batalkan Highlight?" — targetHighlighted selalu false.
  const [pendingItem, setPendingItem] = useState<HighlightItem | null>(null);
  const isConfirmPending = pendingItem ? isToggling(pendingItem) : false;

  async function confirmUnhighlight() {
    if (!pendingItem) return;
    try {
      if (pendingItem.type === 'CORRECTIVE_MAINTENANCE') {
        await cmMutation.mutateAsync({ id: pendingItem.id, isHighlighted: false });
      } else if (pendingItem.type === 'PM_EXECUTION') {
        await pmMutation.mutateAsync({ id: pendingItem.id, isHighlighted: false });
      } else {
        await woMutation.mutateAsync({ id: pendingItem.id, isHighlighted: false });
      }
      notifyHighlightToggled(false);
      setPendingItem(null);
    } catch (err) {
      toast.error(getErrorMessage(err, 'Gagal membatalkan highlight'));
      setPendingItem(null);
    }
  }

  return (
    <div className="space-y-4">
      <PageHeader
        icon={Star}
        title="Highlight Pekerjaan"
        description="Pekerjaan Corrective Maintenance, Preventive Maintenance, dan Work Order yang ditandai untuk dipantau — otomatis hilang dari daftar ini begitu selesai/batal."
      />

      <Card>
        {isLoading ? (
          <LoadingState columns={6} />
        ) : !items || items.length === 0 ? (
          <EmptyState
            icon={Star}
            message="Belum ada pekerjaan yang di-highlight. Tandai dari halaman Corrective Maintenance, Preventive Maintenance, atau Work Order."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs font-medium uppercase tracking-wide text-text-muted">
                  <th className="w-11 px-4 py-2.5">
                    <span className="sr-only">Highlight</span>
                  </th>
                  <th className="px-4 py-2.5">Tipe</th>
                  <th className="px-4 py-2.5">Equipment</th>
                  <th className="px-4 py-2.5">Pekerjaan</th>
                  <th className="px-4 py-2.5">Tanggal</th>
                  <th className="px-4 py-2.5">Status</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => {
                  const meta = TYPE_META[item.type];
                  return (
                    <tr key={`${item.type}-${item.id}`} {...dataRowProps(() => navigate(item.linkTo))}>
                      <td className="px-4 py-2.5">
                        <HighlightToggleButton
                          isHighlighted
                          onToggle={() => setPendingItem(item)}
                          canEdit={canEdit(item.type)}
                          isLoading={isToggling(item)}
                        />
                      </td>
                      <td className="px-4 py-2.5">
                        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-text">
                          <meta.icon className="h-3.5 w-3.5 text-text-muted" />
                          {meta.label}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-text">
                        {item.equipmentTag ?? '—'}
                        {item.equipmentService && <span className="block text-xs text-text-muted">{item.equipmentService}</span>}
                      </td>
                      <td className="max-w-md truncate px-4 py-2.5 text-text" title={item.title}>
                        {item.title}
                      </td>
                      <td className="px-4 py-2.5 text-text-muted">{fmtDate(item.date)}</td>
                      <td className="px-4 py-2.5">
                        <StatusBadge value={item.status} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <HighlightConfirmDialog
        open={Boolean(pendingItem)}
        onOpenChange={(open) => !open && setPendingItem(null)}
        targetHighlighted={false}
        itemLabel={pendingItem?.title}
        loading={isConfirmPending}
        onConfirm={confirmUnhighlight}
      />
    </div>
  );
}
