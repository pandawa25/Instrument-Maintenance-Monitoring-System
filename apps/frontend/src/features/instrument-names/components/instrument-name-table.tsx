import { Pencil, Trash2, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { InstrumentName } from '../types/instrument-name.types';

interface Props {
  items: InstrumentName[];
  isLoading: boolean;
  canEdit: boolean;
  onEdit: (item: InstrumentName) => void;
  onDelete: (item: InstrumentName) => void;
  onView: (item: InstrumentName) => void;
}

export function InstrumentNameTable({ items, isLoading, canEdit, onEdit, onDelete, onView }: Props) {
  if (isLoading) {
    return <div className="p-8 text-center text-sm text-text-muted">Memuat data...</div>;
  }

  if (items.length === 0) {
    return <div className="p-8 text-center text-sm text-text-muted">Belum ada data instrument name.</div>;
  }

  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="border-b border-border bg-surface-2 text-left text-xs uppercase tracking-wide text-text-muted">
          <th className="px-4 py-2.5 font-medium">Code</th>
          <th className="px-4 py-2.5 font-medium">Name</th>
          <th className="px-4 py-2.5 font-medium">Description</th>
          <th className="px-4 py-2.5 font-medium text-center">Total Equipment</th>
          <th className="px-4 py-2.5 font-medium text-right">Action</th>
        </tr>
      </thead>
      <tbody>
        {items.map((item) => (
          <tr key={item.id} className="border-b border-border last:border-0 hover:bg-surface-2/60">
            <td className="px-4 py-2.5 font-mono text-xs text-text">{item.code}</td>
            <td className="px-4 py-2.5 text-text">{item.name}</td>
            <td className="px-4 py-2.5 text-text-muted">{item.description || '—'}</td>
            <td className="px-4 py-2.5 text-center text-text">{item.totalEquipment}</td>
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
