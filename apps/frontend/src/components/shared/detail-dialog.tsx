import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export interface DetailField {
  label: string;
  value: ReactNode;
  fullWidth?: boolean;
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
}

// Dialog read-only generik untuk "View Detail" — dipakai semua modul (Area, Instrument,
// Corrective Maintenance) supaya tampilannya konsisten dan terpisah dari form Create/Edit.
export function DetailDialog({ open, onOpenChange, title, subtitle, icon: Icon, fields, children }: Props) {
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

        <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {fields.map((field) => (
            <div
              key={field.label}
              className={cn(
                'rounded-lg border border-border/60 bg-surface-2/60 px-3 py-2.5',
                field.fullWidth && 'sm:col-span-2',
              )}
            >
              <dt className="text-[11px] font-medium uppercase tracking-wide text-text-muted">{field.label}</dt>
              <dd className="mt-1 whitespace-pre-line text-sm text-text">
                {field.value === null || field.value === undefined || field.value === '' ? (
                  <span className="text-text-muted">—</span>
                ) : (
                  field.value
                )}
              </dd>
            </div>
          ))}
        </dl>

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
