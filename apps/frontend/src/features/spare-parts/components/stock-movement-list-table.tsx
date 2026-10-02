import { ArrowDownToLine, ArrowUpFromLine } from 'lucide-react';
import { LoadingState } from '@/components/shared/loading-state';
import { EmptyState } from '@/components/shared/empty-state';
import type { AllStockMovementItem } from '../types/spare-part.types';

interface Props {
  items: AllStockMovementItem[];
  isLoading: boolean;
  type: 'RESTOCK' | 'STOCK_OUT';
}

/** Tabel ledger lintas-part — dipakai halaman Stock In (type RESTOCK) & Stock Out. */
export function StockMovementListTable({ items, isLoading, type }: Props) {
  const emptyIcon = type === 'RESTOCK' ? ArrowDownToLine : ArrowUpFromLine;

  if (isLoading) {
    return <LoadingState />;
  }

  if (items.length === 0) {
    return (
      <EmptyState
        icon={emptyIcon}
        message={type === 'RESTOCK' ? 'Belum ada riwayat Stock In.' : 'Belum ada riwayat Stock Out.'}
      />
    );
  }

  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="border-b border-border bg-surface-2 text-left text-xs uppercase tracking-wide text-text-muted">
          <th className="px-4 py-2.5 font-medium">Tanggal</th>
          <th className="px-4 py-2.5 font-medium">KIMAP</th>
          <th className="px-4 py-2.5 font-medium">Nama Material</th>
          <th className="px-4 py-2.5 font-medium text-center">Jumlah</th>
          <th className="px-4 py-2.5 font-medium text-center">Saldo Sesudah</th>
          <th className="px-4 py-2.5 font-medium">Dibuat Oleh</th>
          <th className="px-4 py-2.5 font-medium">Catatan</th>
        </tr>
      </thead>
      <tbody>
        {items.map((m) => (
          <tr key={m.id} className="border-b border-border last:border-0 hover:bg-surface-2/60">
            <td className="px-4 py-2.5 text-text-muted">{new Date(m.createdAt).toLocaleString('id-ID')}</td>
            <td className="px-4 py-2.5 font-mono text-xs text-text">{m.sparePart.kimap}</td>
            <td className="px-4 py-2.5 text-text">{m.sparePart.name}</td>
            <td className={`px-4 py-2.5 text-center font-medium ${m.quantityDelta > 0 ? 'text-success' : 'text-danger'}`}>
              {m.quantityDelta > 0 ? `+${m.quantityDelta}` : m.quantityDelta} {m.sparePart.unit}
            </td>
            <td className="px-4 py-2.5 text-center text-text">
              {m.balanceAfter} {m.sparePart.unit}
            </td>
            <td className="px-4 py-2.5 text-text-muted">{m.createdBy?.fullName ?? '—'}</td>
            <td className="px-4 py-2.5 text-text-muted">{m.notes ?? '—'}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
