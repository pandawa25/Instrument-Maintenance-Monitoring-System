import type { ReactNode } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
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
  fields: DetailField[];
  // Konten tambahan di bawah grid field — dipakai mis. untuk AttachmentsSection
  // (Corrective Maintenance) yang tidak cocok direpresentasikan sebagai DetailField biasa.
  children?: ReactNode;
}

// Dialog read-only generik untuk "View Detail" — dipakai semua modul (Area, Instrument,
// Corrective Maintenance) supaya tampilannya konsisten dan terpisah dari form Create/Edit.
export function DetailDialog({ open, onOpenChange, title, fields, children }: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>

        <dl className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
          {fields.map((field) => (
            <div key={field.label} className={cn(field.fullWidth && 'sm:col-span-2')}>
              <dt className="text-xs font-medium uppercase tracking-wide text-text-muted">{field.label}</dt>
              <dd className="mt-1 whitespace-pre-line text-sm text-text">{field.value ?? '—'}</dd>
            </div>
          ))}
        </dl>

        {children}
      </DialogContent>
    </Dialog>
  );
}
