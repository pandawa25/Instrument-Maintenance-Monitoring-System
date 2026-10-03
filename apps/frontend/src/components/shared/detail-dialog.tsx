import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { DetailFieldsGrid, type DetailField } from './detail-fields-grid';

// Re-export supaya semua modul yang sudah `import { type DetailField } from
// '@/components/shared/detail-dialog'` tetap jalan tanpa ubah import path (grid field
// read-only kini dipisah ke detail-fields-grid.tsx supaya bisa dipakai juga di halaman
// penuh — lihat EquipmentDetailPage/MaintenanceDetailPage).
export type { DetailField };

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

// Dialog read-only generik untuk "View Detail" — dipakai modul dengan field flat/sedikit
// (Area, Vendor, Instrument Name, PM Activity Type, Spare Part). Equipment & Corrective
// Maintenance pindah ke halaman penuh (lihat roadmap Risk register) karena datanya lebih
// berat (banyak section + lampiran) — DetailFieldsGrid tetap dipakai bersama supaya
// tampilan field konsisten antara dialog dan halaman.
export function DetailDialog({ open, onOpenChange, title, subtitle, icon: Icon, fields, children, headerContent }: Props) {
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

        <DetailFieldsGrid fields={fields} />

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
