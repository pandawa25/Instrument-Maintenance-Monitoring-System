import { Pencil, Trash2, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/shared/status-badge';
import type { Equipment } from '../types/equipment.types';

interface Props {
  equipment: Equipment[];
  isLoading: boolean;
  canEdit: boolean;
  onEdit: (equipment: Equipment) => void;
  onDelete: (equipment: Equipment) => void;
  onView: (equipment: Equipment) => void;
}

export function EquipmentTable({ equipment, isLoading, canEdit, onEdit, onDelete, onView }: Props) {
  if (isLoading) {
    return <div className="p-8 text-center text-sm text-text-muted">Memuat data...</div>;
  }

  if (equipment.length === 0) {
    return <div className="p-8 text-center text-sm text-text-muted">Belum ada data equipment.</div>;
  }

  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="border-b border-border bg-surface-2 text-left text-xs uppercase tracking-wide text-text-muted">
          <th className="px-4 py-2.5 font-medium">Tag Number</th>
          <th className="px-4 py-2.5 font-medium">Service</th>
          <th className="px-4 py-2.5 font-medium">Instrument Name</th>
          <th className="px-4 py-2.5 font-medium">Type</th>
          <th className="px-4 py-2.5 font-medium">Area</th>
          <th className="px-4 py-2.5 font-medium">Manufacturer</th>
          <th className="px-4 py-2.5 font-medium">Status</th>
          <th className="px-4 py-2.5 font-medium">Last Maintenance</th>
          <th className="px-4 py-2.5 font-medium text-right">Action</th>
        </tr>
      </thead>
      <tbody>
        {equipment.map((item) => (
          <tr key={item.id} className="border-b border-border last:border-0 hover:bg-surface-2/60">
            <td className="px-4 py-2.5 font-mono text-xs text-text">{item.tagNumber}</td>
            <td className="px-4 py-2.5 text-text">{item.service}</td>
            <td className="px-4 py-2.5 text-text-muted">{item.instrumentName.name}</td>
            <td className="px-4 py-2.5 text-text-muted">{item.type || '—'}</td>
            <td className="px-4 py-2.5 text-text-muted">{item.area.areaCode}</td>
            <td className="px-4 py-2.5 text-text-muted">{item.manufacturer || '—'}</td>
            <td className="px-4 py-2.5">
              <StatusBadge value={item.status} />
            </td>
            <td className="px-4 py-2.5 text-text-muted">
              {item.lastMaintenanceDate ? new Date(item.lastMaintenanceDate).toLocaleDateString('id-ID') : '—'}
            </td>
            <td className="px-4 py-2.5">
              <div className="flex justify-end gap-1">
                <Button variant="ghost" size="icon" onClick={() => onView(item)} title="View detail">
                  <Eye className="h-4 w-4" />
                </Button>
                {canEdit && (
                  <>
                    <Button variant="ghost" size="icon" onClick={() => onEdit(item)} title="Edit">
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => onDelete(item)} title="Delete">
                      <Trash2 className="h-4 w-4 text-danger" />
                    </Button>
                  </>
                )}
              </div>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
