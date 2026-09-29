import { Pencil, Trash2, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/shared/status-badge';
import type { SparePart } from '../types/spare-part.types';

interface Props {
  items: SparePart[];
  isLoading: boolean;
  canEdit: boolean;
  onEdit: (item: SparePart) => void;
  onDelete: (item: SparePart) => void;
  onView: (item: SparePart) => void;
}

export function SparePartTable({ items, isLoading, canEdit, onEdit, onDelete, onView }: Props) {
  if (isLoading) {
    return <div className="p-8 text-center text-sm text-text-muted">Memuat data...</div>;
  }

  if (items.length === 0) {
    return <div className="p-8 text-center text-sm text-text-muted">Belum ada data spare part / material.</div>;
  }

  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="border-b border-border bg-surface-2 text-left text-xs uppercase tracking-wide text-text-muted">
          <th className="px-4 py-2.5 font-medium">KIMAP</th>
          <th className="px-4 py-2.5 font-medium">Nama</th>
          <th className="px-4 py-2.5 font-medium">Unit</th>
          <th className="px-4 py-2.5 font-medium text-center">Stock</th>
          <th className="px-4 py-2.5 font-medium">Status</th>
          <th className="px-4 py-2.5 font-medium text-right">Action</th>
        </tr>
      </thead>
      <tbody>
        {items.map((item) => (
          <tr key={item.id} className="border-b border-border last:border-0 hover:bg-surface-2/60">
            <td className="px-4 py-2.5 font-mono text-xs text-text">{item.kimap}</td>
            <td className="px-4 py-2.5 text-text">{item.name}</td>
            <td className="px-4 py-2.5 text-text-muted">{item.unit}</td>
            <td className="px-4 py-2.5 text-center text-text">{item.stock}</td>
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
