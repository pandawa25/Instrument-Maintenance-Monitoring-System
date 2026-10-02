import { PackageX } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { LoadingState } from '@/components/shared/loading-state';
import { EmptyState } from '@/components/shared/empty-state';
import type { LowStockItem } from '../types/spare-part.types';

interface Props {
  items?: LowStockItem[];
  isLoading: boolean;
}

export function LowStockTable({ items, isLoading }: Props) {
  return (
    <Card>
      <div className="border-b border-border px-4 py-3">
        <h3 className="text-sm font-semibold text-text">Low Stock Items</h3>
        <p className="text-xs text-text-muted">Spare part dengan stock di bawah atau sama dengan ambang min. stock.</p>
      </div>

      {isLoading ? (
        <LoadingState />
      ) : !items || items.length === 0 ? (
        <EmptyState icon={PackageX} message="Tidak ada item low stock saat ini." />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-surface-2 text-left text-xs uppercase tracking-wide text-text-muted">
                <th className="px-4 py-2 font-medium">KIMAP</th>
                <th className="px-4 py-2 font-medium">Nama Material</th>
                <th className="px-4 py-2 font-medium text-center">Stock</th>
                <th className="px-4 py-2 font-medium text-center">Min. Stock</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id} className="border-b border-border last:border-0">
                  <td className="px-4 py-2 font-mono text-xs text-text">{item.kimap}</td>
                  <td className="px-4 py-2 text-text">{item.name}</td>
                  <td className={`px-4 py-2 text-center font-medium ${item.stock === 0 ? 'text-danger' : 'text-warning'}`}>
                    {item.stock} {item.unit}
                  </td>
                  <td className="px-4 py-2 text-center text-text-muted">
                    {item.minStock} {item.unit}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}
