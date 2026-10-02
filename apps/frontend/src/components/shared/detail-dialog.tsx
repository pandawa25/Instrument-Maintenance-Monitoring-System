import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export interface DetailField {
  label: string;
  value: ReactNode;
  fullWidth?: boolean;
  // Nama section untuk mengelompokkan field (mis. "Info Utama", "Referensi ERP"). Field
  // tanpa section masuk ke grup default (tidak dapat heading) — 100% backward compatible
  // untuk modul yang belum butuh pengelompokan (Area, Instrument, dsb).
  section?: string;
  // Tampilan ringan tanpa border/bg box, dipakai untuk metadata sekunder (audit trail —
  // dibuat/diubah) yang tidak perlu bobot visual sama dengan field operasional.
  compact?: boolean;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  subtitle?: string;
  icon?: LucideIcon;
  fields: DetailField[];
  // Konten tambahan di bawah grid field — dipakai mis. untuk AttachmentsSection
  // (Corrective Maintenance) yang tidak cocok direpresentasikan sebagai DetailField biasa.
  children?: ReactNode;
  // Konten di bawah title, sebelum grid field — dipakai untuk badge Status/Priority yang
  // perlu terlihat langsung tanpa scroll (tidak dikubur di tengah grid).
  headerContent?: ReactNode;
}

function FieldBox({ field }: { field: DetailField }) {
  const isEmpty = field.value === null || field.value === undefined || field.value === '';

  if (field.compact) {
    return (
      <div className={cn('text-xs text-text-muted', field.fullWidth && 'sm:col-span-2')}>
        <span className="font-medium">{field.label}:</span>{' '}
        {isEmpty ? '—' : field.value}
      </div>
    );
  }

  return (
    <div
      className={cn(
        'rounded-lg border border-border/60 bg-surface-2/60 px-3 py-2.5',
        field.fullWidth && 'sm:col-span-2',
      )}
    >
      <dt className="text-[11px] font-medium uppercase tracking-wide text-text-muted">{field.label}</dt>
      <dd className="mt-1 whitespace-pre-line text-sm text-text">
        {isEmpty ? <span className="text-text-muted">—</span> : field.value}
      </dd>
    </div>
  );
}

// Dialog read-only generik untuk "View Detail" — dipakai semua modul (Area, Instrument,
// Corrective Maintenance) supaya tampilannya konsisten dan terpisah dari form Create/Edit.
export function DetailDialog({ open, onOpenChange, title, subtitle, icon: Icon, fields, children, headerContent }: Props) {
  // Kelompokkan field berurutan sesuai kemunculan section pertama kali — field tanpa
  // `section` dikumpulkan di grup tanpa nama (key kosong, tidak dapat heading).
  const groups: { section: string; fields: DetailField[] }[] = [];
  for (const field of fields) {
    const section = field.section ?? '';
    let group = groups.find((g) => g.section === section);
    if (!group) {
      group = { section, fields: [] };
      groups.push(group);
    }
    group.fields.push(field);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <div className="flex items-center gap-3">
            {Icon && (
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-tint text-primary">
                <Icon className="h-5 w-5" />
              </div>
            )}
            <div>
              <DialogTitle>{title}</DialogTitle>
              {subtitle && <p className="mt-0.5 text-sm text-text-muted">{subtitle}</p>}
            </div>
          </div>
        </DialogHeader>

        {headerContent}

        <div className="space-y-4">
          {groups.map((group, i) => (
            <div key={group.section || `__default-${i}`} className={cn(i > 0 && 'border-t border-border/60 pt-4')}>
              {group.section && (
                <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-text-muted">
                  {group.section}
                </h4>
              )}
              <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {group.fields.map((field) => (
                  <FieldBox key={field.label} field={field} />
                ))}
              </dl>
            </div>
          ))}
        </div>

        {children}

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Tutup
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
