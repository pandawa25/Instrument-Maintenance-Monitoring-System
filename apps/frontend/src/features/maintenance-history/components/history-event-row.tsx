import { useId, useState } from 'react';
import { Link } from 'react-router-dom';
import { CalendarCheck, ChevronRight, Clock, Package, Wrench } from 'lucide-react';
import { StatusBadge } from '@/components/shared/status-badge';
import { usePermission } from '@/store/auth.store';
import { cn } from '@/lib/utils';
import { formatHours } from '../utils/format';
import { HistoryEventDetail } from './history-event-detail';
import type { HistoryEvent } from '../types/maintenance-history.types';

function dayLabel(date: string): string {
  const day = Number(date.slice(8, 10));
  return Number.isFinite(day) ? String(day) : date;
}

// Satu kegiatan = satu baris ringkas. Judul = tautan ke halaman detail; tombol panah membuka
// ringkasan lengkap di tempat (tanpa pindah halaman).
export function HistoryEventRow({ event }: { event: HistoryEvent }) {
  const canViewPm = usePermission('PM_PROGRAM', 'view');
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const isCorrective = event.kind === 'CORRECTIVE';
  const Icon = isCorrective ? Wrench : CalendarCheck;

  const href = isCorrective
    ? `/maintenance/${event.id}`
    : event.preventive && canViewPm
      ? `/pm-programs/${event.preventive.programId}`
      : null;

  const downtime = event.corrective?.downtimeHours ?? null;
  const pendingMaterial = event.materials.some((m) => !m.consumed);

  return (
    <li data-kind={event.kind} className="rounded-lg hover:bg-surface-2/60">
      <div className="flex items-start gap-2 px-2 py-1.5">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-controls={panelId}
          aria-label={`${open ? 'Tutup' : 'Buka'} ringkasan ${event.title}`}
          className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded text-text-muted hover:bg-surface-2 hover:text-text focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
        >
          <ChevronRight className={cn('h-4 w-4 transition-transform', open && 'rotate-90')} />
        </button>

        <span className="mt-0.5 w-6 shrink-0 text-right text-sm font-semibold tabular-nums text-text" title={event.date}>
          {dayLabel(event.date)}
        </span>

        <span
          aria-hidden
          className={cn(
            'mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full',
            isCorrective ? 'bg-warning/15 text-warning' : 'bg-secondary/15 text-secondary',
          )}
          title={isCorrective ? 'Corrective' : 'Preventive'}
        >
          <Icon className="h-3.5 w-3.5" />
        </span>

        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-3 gap-y-1">
          <span className="min-w-0 flex-1 basis-48 text-sm font-medium text-text">
            {href ? (
              <Link to={href} className="block truncate text-primary hover:underline" title={event.title}>
                {event.title}
              </Link>
            ) : (
              <span className="block truncate" title={event.title}>
                {event.title}
              </span>
            )}
          </span>
          <span className="sr-only">{isCorrective ? 'Corrective' : 'Preventive'}</span>

          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-text-muted">
            <StatusBadge value={event.status} dot />
            {downtime !== null && (
              <span className="inline-flex items-center gap-1" title="Downtime">
                <Clock className="h-3 w-3" aria-hidden /> {formatHours(downtime)}
              </span>
            )}
            {event.materials.length > 0 && (
              <span
                className={cn('inline-flex items-center gap-1', pendingMaterial && 'text-warning')}
                title={pendingMaterial ? 'Ada material yang belum terpakai' : 'Material terpakai'}
              >
                <Package className="h-3 w-3" aria-hidden /> {event.materials.length} material
              </span>
            )}
          </div>
        </div>
      </div>

      {open && (
        <div id={panelId} className="mb-1 ml-10 mr-2 rounded-lg border border-border bg-surface p-3">
          <HistoryEventDetail event={event} />
        </div>
      )}
    </li>
  );
}
