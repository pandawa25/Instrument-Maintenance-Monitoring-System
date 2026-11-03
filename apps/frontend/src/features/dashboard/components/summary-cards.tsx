import type { LucideIcon } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { MapPinned, Gauge, AlertTriangle, CheckCircle2, CalendarClock, PackageX, Unlink } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { usePermission } from '@/store/auth.store';
import { useWorkOrderUnmatchedCount } from '@/features/work-orders/hooks/use-work-orders';
import type { DashboardSummary } from '../types/dashboard.types';

interface CardDef {
  label: string;
  value: number;
  icon: LucideIcon;
  accent: string; // warna ikon & aksen kiri kartu
  hint?: string;
  /** Kalau diisi, kartu jadi bisa diklik (navigasi) — dipakai kartu alert seperti WO Belum Terhubung. */
  onClick?: () => void;
}

interface Props {
  summary: DashboardSummary | undefined;
  isLoading: boolean;
}

export function SummaryCards({ summary, isLoading }: Props) {
  const navigate = useNavigate();
  // Kartu "WO Belum Terhubung" hanya untuk role yang punya akses modul Notification & Work
  // Order — enabled di-gate dari sini supaya role tanpa akses tidak ikut fetch datanya.
  const canViewWorkOrders = usePermission('WORK_ORDER', 'view');
  const { data: unmatchedWorkOrders, isLoading: unmatchedLoading } = useWorkOrderUnmatchedCount(canViewWorkOrders);

  const cards: CardDef[] = [
    { label: 'Total Area', value: summary?.totalArea ?? 0, icon: MapPinned, accent: 'text-primary' },
    { label: 'Total Equipment', value: summary?.totalEquipment ?? 0, icon: Gauge, accent: 'text-secondary' },
    {
      label: 'Open Maintenance',
      value: summary?.openMaintenance ?? 0,
      icon: AlertTriangle,
      accent: 'text-danger',
      hint: 'Status Open + In Progress',
    },
    {
      label: 'Completed Maintenance',
      value: summary?.completedMaintenance ?? 0,
      icon: CheckCircle2,
      accent: 'text-success',
    },
    {
      label: 'PM Execution Pending',
      value: summary?.pmExecutionPending ?? 0,
      icon: CalendarClock,
      accent: 'text-warning',
      hint: 'Semua equipment yang belum dieksekusi',
    },
    {
      label: 'Spare Part Low Stock',
      value: summary?.sparePartLowStock ?? 0,
      icon: PackageX,
      accent: 'text-danger',
      hint: 'Stock ≤ ambang min. per item',
    },
  ];

  if (canViewWorkOrders) {
    cards.push({
      label: 'WO Belum Terhubung',
      value: unmatchedWorkOrders ?? 0,
      icon: Unlink,
      accent: 'text-warning',
      hint: 'Equipment hasil import ERP belum ter-link',
      onClick: () => navigate('/work-orders'),
    });
  }

  const cardIsLoading = (card: CardDef) => (card.label === 'WO Belum Terhubung' ? unmatchedLoading : isLoading);

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-6">
      {cards.map((card) => {
        const content = (
          <>
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium uppercase tracking-wide text-text-muted">{card.label}</span>
              <card.icon className={cn('h-4 w-4 shrink-0', card.accent)} />
            </div>
            <div className="mt-2 text-2xl font-semibold text-text">
              {cardIsLoading(card) ? (
                <span className="inline-block h-7 w-12 animate-pulse rounded bg-surface-2" />
              ) : (
                card.value
              )}
            </div>
            {card.hint && <p className="mt-1 text-[11px] text-text-muted">{card.hint}</p>}
          </>
        );

        return card.onClick ? (
          <button
            key={card.label}
            type="button"
            onClick={card.onClick}
            className="rounded-xl border border-border bg-surface p-4 text-left shadow-card transition-shadow hover:shadow-card-hover"
          >
            {content}
          </button>
        ) : (
          <Card key={card.label} className="p-4">
            {content}
          </Card>
        );
      })}
    </div>
  );
}
