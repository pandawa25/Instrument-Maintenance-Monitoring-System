import { Pencil, Trash2, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/shared/status-badge';
import type { Maintenance } from '../types/maintenance.types';

const FAILURE_CATEGORY_LABEL: Record<Maintenance['failureCategory'], string> = {
  INSTRUMENT: 'Instrument',
  ELECTRICAL: 'Electrical',
  MECHANICAL: 'Mechanical',
  COMMUNICATION: 'Communication',
  CONFIGURATION: 'Configuration',
  CALIBRATION: 'Calibration',
  PROCESS: 'Process',
};

interface Props {
  items: Maintenance[];
  isLoading: boolean;
  canEdit: boolean;
  onEdit: (item: Maintenance) => void;
  onDelete: (item: Maintenance) => void;
  onView: (item: Maintenance) => void;
}

export function MaintenanceTable({ items, isLoading, canEdit, onEdit, onDelete, onView }: Props) {
  if (isLoading) {
    return <div className="p-8 text-center text-sm text-text-muted">Memuat data...</div>;
  }

  if (items.length === 0) {
    return <div className="p-8 text-center text-sm text-text-muted">Belum ada data corrective maintenance.</div>;
  }

  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="border-b border-border bg-surface-2 text-left text-xs uppercase tracking-wide text-text-muted">
          <th className="px-4 py-2.5 font-medium">Maintenance Date</th>
          <th className="px-4 py-2.5 font-medium">Tag Number</th>
          <th className="px-4 py-2.5 font-medium">Service</th>
          <th className="px-4 py-2.5 font-medium">Area</th>
          <th className="px-4 py-2.5 font-medium">Failure Category</th>
          <th className="px-4 py-2.5 font-medium">Problem Description</th>
          <th className="px-4 py-2.5 font-medium">Technician</th>
          <th className="px-4 py-2.5 font-medium">Status</th>
          <th className="px-4 py-2.5 font-medium text-right">Action</th>
        </tr>
      </thead>
      <tbody>
        {items.map((item) => (
          <tr key={item.id} className="border-b border-border last:border-0 hover:bg-surface-2/60">
            <td className="px-4 py-2.5 text-text-muted">
              {new Date(item.maintenanceDate).toLocaleDateString('id-ID')}
            </td>
            <td className="px-4 py-2.5 font-mono text-xs text-text">{item.equipment.tagNumber}</td>
            <td className="px-4 py-2.5 text-text">{item.equipment.service}</td>
            <td className="px-4 py-2.5 text-text-muted">{item.area.areaCode}</td>
            <td className="px-4 py-2.5 text-text-muted">{FAILURE_CATEGORY_LABEL[item.failureCategory]}</td>
            <td className="max-w-xs truncate px-4 py-2.5 text-text-muted" title={item.problemDescription}>
              {item.problemDescription}
            </td>
            <td className="px-4 py-2.5 text-text-muted">{item.technician.fullName}</td>
            <td className="px-4 py-2.5">
              <StatusBadge value={item.status} />
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
