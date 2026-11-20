import { Bell } from 'lucide-react';
import { Link } from 'react-router-dom';
import { usePermission } from '@/store/auth.store';
import { useMaintenanceKpiSummary } from '@/features/maintenance/hooks/use-maintenance';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface NotificationItem {
  to: string;
  label: string;
}

// Bell ini HANYA menampilkan angka yang benar-benar ada di data (KPI summary
// maintenance yang sudah dipakai di dashboard & list page) — tidak ada count
// "fake" yang tidak didukung backend.
export function NotificationBell() {
  const canViewMaintenance = usePermission('CORRECTIVE_MAINTENANCE', 'view');
  const { data: summary } = useMaintenanceKpiSummary();

  const items: NotificationItem[] = [];
  if (canViewMaintenance && summary) {
    if (summary.overdueCount > 0) {
      // Tidak ada filter "overdue" di query param backend, jadi link cuma
      // arahkan ke list-nya saja — bukan ke filter status yang menyesatkan.
      items.push({
        to: '/maintenance',
        label: `${summary.overdueCount} Corrective Maintenance overdue`,
      });
    }
    if (summary.waitingMaterialStuckCount > 0) {
      items.push({
        to: '/maintenance?status=WAITING_MATERIAL',
        label: `${summary.waitingMaterialStuckCount} Waiting Material tertahan lama`,
      });
    }
  }

  const count = items.length;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-text-muted transition-colors hover:bg-surface-2 hover:text-text"
          aria-label="Notifikasi"
        >
          <Bell className="h-5 w-5" />
          {count > 0 && (
            <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-danger ring-2 ring-surface" />
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-72">
        <DropdownMenuLabel>Notifikasi</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {items.length === 0 ? (
          <p className="px-2.5 py-3 text-center text-xs text-text-muted">
            Tidak ada yang perlu perhatian segera.
          </p>
        ) : (
          items.map((item) => (
            <DropdownMenuItem key={item.to + item.label} asChild>
              <Link to={item.to}>{item.label}</Link>
            </DropdownMenuItem>
          ))
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
