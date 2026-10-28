import type { ReactNode } from 'react';
import { StatusBadge } from '@/components/shared/status-badge';
import { cn } from '@/lib/utils';
import { failureCategoryLabel, failureModeLabel } from '@/features/maintenance/utils/failure';
import { formatDate, formatHours, formatNumber } from '../utils/format';
import type { CorrectiveDetail, HistoryEvent, HistoryMaterial, PreventiveDetail } from '../types/maintenance-history.types';

function Field({ label, children, wide }: { label: string; children: ReactNode; wide?: boolean }) {
  return (
    <div className={cn('min-w-0', wide && 'sm:col-span-2')}>
      <dt className="text-[11px] font-medium uppercase tracking-wide text-text-muted">{label}</dt>
      <dd className="mt-0.5 whitespace-pre-line break-words text-sm text-text">
        {children === null || children === undefined || children === '' ? <span className="text-text-muted">—</span> : children}
      </dd>
    </div>
  );
}

function MaterialList({ materials }: { materials: HistoryMaterial[] }) {
  if (materials.length === 0) return null;
  const pending = materials.some((m) => !m.consumed);

  return (
    <div className="mt-3 rounded-lg border border-border/70 bg-surface-2/50">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/70 px-3 py-2">
        <span className="text-xs font-semibold text-text">Material / Spare Part ({materials.length})</span>
        {pending && (
          <span className="text-[11px] text-warning">Belum terpakai — stok baru berkurang saat tiket Completed</span>
        )}
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-[11px] uppercase tracking-wide text-text-muted">
              <th className="px-3 py-1.5 font-medium">Kimap</th>
              <th className="px-3 py-1.5 font-medium">Material</th>
              <th className="px-3 py-1.5 text-right font-medium">Qty</th>
              <th className="px-3 py-1.5 font-medium">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/60">
            {materials.map((m, idx) => (
              <tr key={`${m.sparePartId}-${idx}`}>
                <td className="whitespace-nowrap px-3 py-1.5 font-mono text-xs text-text">{m.kimap}</td>
                <td className="px-3 py-1.5 text-text">
                  {m.name}
                  {m.remarks && <span className="block text-xs text-text-muted">{m.remarks}</span>}
                </td>
                <td className="whitespace-nowrap px-3 py-1.5 text-right font-medium text-text">
                  {formatNumber(m.quantity)} {m.unit}
                </td>
                <td className="px-3 py-1.5">
                  {m.consumed ? (
                    <span className="text-xs font-medium text-success">Terpakai</span>
                  ) : (
                    <span className="text-xs font-medium text-warning">Kebutuhan</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function CorrectiveBody({ detail }: { detail: CorrectiveDetail }) {
  const team = [detail.technician, ...detail.additionalTechnicians].join(', ');
  return (
    <dl className="mt-3 grid gap-x-4 gap-y-2.5 sm:grid-cols-2">
      <Field label="Kategori Kegagalan">{failureCategoryLabel(detail.failureCategory)}</Field>
      {detail.failureMode && <Field label="Failure Mode">{failureModeLabel(detail.failureMode)}</Field>}
      <Field label="Prioritas">
        <StatusBadge value={detail.priority} />
      </Field>
      <Field label="Root Cause" wide>
        {detail.rootCause}
      </Field>
      <Field label="Tindakan" wide>
        {detail.actionTaken}
      </Field>
      <Field label="Downtime">{formatHours(detail.downtimeHours)}</Field>
      <Field label="Selesai">{detail.completionDate ? formatDate(detail.completionDate) : null}</Field>
      <Field label="Teknisi" wide>
        {team}
      </Field>
      {(detail.spkNumber || detail.workOrderNumber || detail.notificationNumber) && (
        <Field label="Referensi" wide>
          {[
            detail.spkNumber && `e-SPK ${detail.spkNumber}`,
            detail.workOrderNumber && `WO ${detail.workOrderNumber}`,
            detail.notificationNumber && `Notif ${detail.notificationNumber}`,
          ]
            .filter(Boolean)
            .join(' · ')}
        </Field>
      )}
    </dl>
  );
}

function PreventiveBody({ detail }: { detail: PreventiveDetail }) {
  return (
    <dl className="mt-3 grid gap-x-4 gap-y-2.5 sm:grid-cols-2">
      <Field label="Hasil">{detail.result ? <StatusBadge value={detail.result} /> : null}</Field>
      <Field label="Checklist">
        {detail.checklistTotal > 0
          ? `${detail.checklistTotal - detail.checklistNotOk} dari ${detail.checklistTotal} item OK${
              detail.checklistNotOk > 0 ? ` · ${detail.checklistNotOk} Not OK` : ''
            }`
          : null}
      </Field>
      <Field label="Temuan" wide>
        {detail.findings}
      </Field>
      <Field label="Tindakan" wide>
        {detail.actionTaken}
      </Field>
      <Field label="Vendor">{detail.vendorName}</Field>
      <Field label="Personel Vendor">{detail.vendorPersonnel}</Field>
      <Field label="Jadwal Rencana">{formatDate(detail.plannedDate)}</Field>
      {detail.workOrderNumber && <Field label="Work Order">{detail.workOrderNumber}</Field>}
    </dl>
  );
}

// Isi lengkap satu kegiatan — hanya dirender saat baris di tree dibuka (lihat history-event-row.tsx).
export function HistoryEventDetail({ event }: { event: HistoryEvent }) {
  return (
    <div>
      {event.corrective && <CorrectiveBody detail={event.corrective} />}
      {event.preventive && <PreventiveBody detail={event.preventive} />}
      <MaterialList materials={event.materials} />
      {event.remarks && (
        <p className="mt-3 border-t border-border pt-2 text-xs text-text-muted">
          <span className="font-medium">Catatan:</span> {event.remarks}
        </p>
      )}
    </div>
  );
}
