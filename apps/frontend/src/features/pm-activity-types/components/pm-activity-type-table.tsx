import { Pencil, Trash2, Eye, ListChecks } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { LoadingState } from '@/components/shared/loading-state';
import { EmptyState } from '@/components/shared/empty-state';
import type { PmActivityType } from '../types/pm-activity-type.types';

interface Props {
  items: PmActivityType[];
  isLoading: boolean;
  canEdit: boolean;
  onEdit: (item: PmActivityType) => void;
  onDelete: (item: PmActivityType) => void;
  onView: (item: PmActivityType) => void;
}

export function PmActivityTypeTable({ items, isLoading, canEdit, onEdit, onDelete, onView }: Props) {
  if (isLoading) {
    return <LoadingState />;
  }

  if (items.length === 0) {
    return <EmptyState icon={ListChecks} message="Belum ada data activity type." />;
  }

  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="border-b border-border bg-surface-2 text-left text-xs uppercase tracking-wide text-text-muted">
          <th className="px-4 py-2.5 font-medium">Code</th>
          <th className="px-4 py-2.5 font-medium">Name</th>
          <th className="px-4 py-2.5 font-medium">Description</th>
          <th className="px-4 py-2.5 font-medium text-center">Dipakai di Checklist</th>
          <th className="px-4 py-2.5 font-medium text-right">Action</th>
        </tr>
      </thead>
      <tbody>
        {items.map((item) => (
          <tr key={item.id} className="border-b border-border last:border-0 hover:bg-surface-2/60">
            <td className="px-4 py-2.5 font-mono text-xs text-text">{item.code}</td>
            <td className="px-4 py-2.5 text-text">{item.name}</td>
            <td className="px-4 py-2.5 text-text-muted">{item.description || '—'}</td>
            <td className="px-4 py-2.5 text-center text-text">{item.totalChecklistItem}</td>
            <td className="px-4 py-2.5">
              <div className="flex justify-end gap-1">
                <Button variant="ghost" size="icon" onClick={() => onView(item)} title="View detail" aria-label="View detail">
                  <Eye className="h-4 w-4" />
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
