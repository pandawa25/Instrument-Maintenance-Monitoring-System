import { Pencil, Trash2, Eye, PackagePlus, PackageSearch } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/shared/status-badge';
import { LoadingState } from '@/components/shared/loading-state';
import { EmptyState } from '@/components/shared/empty-state';
import type { SparePart } from '../types/spare-part.types';

interface Props {
  items: SparePart[];
  isLoading: boolean;
  canEdit: boolean;
  onEdit: (item: SparePart) => void;
  onDelete: (item: SparePart) => void;
  onView: (item: SparePart) => void;
  onStockMovement: (item: SparePart) => void;
}

export function SparePartTable({ items, isLoading, canEdit, onEdit, onDelete, onView, onStockMovement }: Props) {
  if (isLoading) {
    return <LoadingState />;
  }

  if (items.length === 0) {
    return <EmptyState icon={PackageSearch} message="Belum ada data spare part / material." />;
  }

  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="border-b border-border bg-surface-2 text-left text-xs uppercase tracking-wide text-text-muted">
          <th className="px-4 py-2.5 font-medium">KIMAP</th>
          <th className="px-4 py-2.5 font-medium">Nama</th>
          <th className="px-4 py-2.5 font-medium text-center">Stock</th>
          <th className="px-4 py-2.5 font-medium">Unit</th>
          <th className="px-4 py-2.5 font-medium">Status</th>
          <th className="px-4 py-2.5 font-medium text-right">Action</th>
        </tr>
      </thead>
      <tbody>
        {items.map((item) => (
          <tr key={item.id} className="border-b border-border last:border-0 hover:bg-surface-2/60">
            <td className="px-4 py-2.5 font-mono text-xs text-text">{item.kimap}</td>
            <td className="px-4 py-2.5 text-text">{item.name}</td>
            <td
              className={`px-4 py-2.5 text-center font-medium ${item.stock <= item.minStock ? 'text-danger' : 'text-text'}`}
              title={item.stock <= item.minStock ? `Low stock — ambang ${item.minStock}` : undefined}
            >
              {item.stock}
            </td>
            <td className="px-4 py-2.5 text-text-muted">{item.unit}</td>
            <td className="px-4 py-2.5">
              <StatusBadge value={item.status} />
            </td>
            <td className="px-4 py-2.5">
              <div className="flex justify-end gap-1">
                <Button variant="ghost" size="icon" onClick={() => onView(item)} title="View detail" aria-label="View detail">
                  <Eye className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" onClick={() => onStockMovement(item)} title="Stock In / Out / Adjustment" aria-label="Stock In / Out / Adjustment">
                  <PackagePlus className="h-4 w-4" />
                </Button>
                {canEdit && (
                  <>
                    <Button variant="ghost" size="icon" onClick={() => onEdit(item)} title="Edit" aria-label="Edit">
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => onDelete(item)} title="Delete" aria-label="Delete">
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
