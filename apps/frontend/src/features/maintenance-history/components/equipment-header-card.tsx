import { Link } from 'react-router-dom';
import { ArrowLeft, ExternalLink, Gauge } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { StatusBadge } from '@/components/shared/status-badge';
import { usePermission } from '@/store/auth.store';
import { formatDate } from '../utils/format';
import type { HistoryEquipmentHeader } from '../types/maintenance-history.types';

function Meta({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div className="min-w-0">
      <dt className="text-[11px] font-medium uppercase tracking-wide text-text-muted">{label}</dt>
      <dd className="mt-0.5 truncate text-sm text-text">{value || '—'}</dd>
    </div>
  );
}

export function EquipmentHeaderCard({ equipment, onChange }: { equipment: HistoryEquipmentHeader; onChange: () => void }) {
  // Tautan ke Master Equipment hanya untuk role yang boleh membuka modul tsb (route-nya dijaga permission).
  const canViewEquipment = usePermission('EQUIPMENT', 'view');

  return (
    <Card className="p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary-tint text-primary">
            <Gauge className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="font-mono text-lg font-semibold text-text">{equipment.tagNumber}</h3>
              <StatusBadge value={equipment.status} dot />
              <StatusBadge value={equipment.criticality} />
            </div>
            <p className="truncate text-sm text-text-muted">{equipment.service}</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {canViewEquipment && (
            <Button variant="outline" size="sm" asChild>
              <Link to={`/equipment/${equipment.id}`}>
                <ExternalLink className="h-3.5 w-3.5" />
                Master Equipment
              </Link>
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={onChange}>
            <ArrowLeft className="h-3.5 w-3.5" />
            Cari equipment lain
          </Button>
        </div>
      </div>

      <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 border-t border-border pt-4 sm:grid-cols-3 lg:grid-cols-5">
        <Meta label="Area" value={equipment.area.areaName} />
        <Meta label="Instrument" value={equipment.instrumentName.name} />
        <Meta label="Manufacturer / Model" value={[equipment.manufacturer, equipment.model].filter(Boolean).join(' / ')} />
        <Meta label="Serial Number" value={equipment.serialNumber} />
        <Meta label="Tanggal Instalasi" value={equipment.installationDate ? formatDate(equipment.installationDate) : null} />
      </dl>
    </Card>
  );
}
