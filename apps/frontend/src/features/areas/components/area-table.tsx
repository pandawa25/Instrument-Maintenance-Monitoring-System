import { Pencil, Trash2, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/shared/status-badge';
import type { Area } from '../types/area.types';

interface Props {
  areas: Area[];
  isLoading: boolean;
  canEdit: boolean;
  onEdit: (area: Area) => void;
  onDelete: (area: Area) => void;
  onView: (area: Area) => void;
}

export function AreaTable({ areas, isLoading, canEdit, onEdit, onDelete, onView }: Props) {
  if (isLoading) {
    return <div className="p-8 text-center text-sm text-text-muted">Memuat data...</div>;
  }

  if (areas.length === 0) {
    return <div className="p-8 text-center text-sm text-text-muted">Belum ada data area.</div>;
  }

  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="border-b border-border bg-surface-2 text-left text-xs uppercase tracking-wide text-text-muted">
          <th className="px-4 py-2.5 font-medium">Area Code</th>
          <th className="px-4 py-2.5 font-medium">Area Name</th>
          <th className="px-4 py-2.5 font-medium">Description</th>
          <th className="px-4 py-2.5 font-medium text-center">Total Equipment</th>
          <th className="px-4 py-2.5 font-medium">Status</th>
          <th className="px-4 py-2.5 font-medium">Created Date</th>
          <th className="px-4 py-2.5 font-medium text-right">Action</th>
        </tr>
      </thead>
      <tbody>
        {areas.map((area) => (
          <tr key={area.id} className="border-b border-border last:border-0 hover:bg-surface-2/60">
            <td className="px-4 py-2.5 font-mono text-xs text-text">{area.areaCode}</td>
            <td className="px-4 py-2.5 text-text">{area.areaName}</td>
            <td className="px-4 py-2.5 text-text-muted">{area.description || '—'}</td>
            <td className="px-4 py-2.5 text-center text-text">{area.totalEquipment}</td>
            <td className="px-4 py-2.5">
              <StatusBadge value={area.status} />
            </td>
            <td className="px-4 py-2.5 text-text-muted">
              {new Date(area.createdAt).toLocaleDateString('id-ID')}
            </td>
            <td className="px-4 py-2.5">
              <div className="flex justify-end gap-1">
                <Button variant="ghost" size="icon" onClick={() => onView(area)} title="View detail">
                  <Eye className="h-4 w-4" />
                </Button>
                {canEdit && (
                  <>
                    <Button variant="ghost" size="icon" onClick={() => onEdit(area)} title="Edit">
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => onDelete(area)} title="Delete">
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
