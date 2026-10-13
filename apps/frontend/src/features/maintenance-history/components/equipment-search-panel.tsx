import { useId, useState } from 'react';
import { Check, History, Loader2, Search, SearchX, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { EmptyState } from '@/components/shared/empty-state';
import { StatusBadge } from '@/components/shared/status-badge';
import { useDebouncedValue } from '@/lib/use-debounced-value';
import { cn } from '@/lib/utils';
import { useHistoryEquipmentSearch } from '../hooks/use-maintenance-history';
import type { HistoryEquipmentOption } from '../types/maintenance-history.types';

interface Props {
  onShow: (equipmentId: string) => void;
}

// Halaman awal History Maintenance: cari equipment berdasarkan tag number -> pilih satu dari hasil ->
// tekan "Tampilkan History". History TIDAK dimuat sebelum tombol ditekan.
export function EquipmentSearchPanel({ onShow }: Props) {
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<HistoryEquipmentOption | null>(null);
  const debouncedQuery = useDebouncedValue(query, 300);
  const listId = useId();

  const term = debouncedQuery.trim();
  const { data, isFetching, isError } = useHistoryEquipmentSearch(debouncedQuery);
  // placeholderData milik hook mempertahankan hasil sebelumnya — sembunyikan saat kolom dikosongkan.
  const results = term ? (data ?? []) : [];
  const typing = query.trim() !== term; // masih menunggu debounce

  // Enter di kolom pencarian: pilih yang cocok persis dengan tag, atau satu-satunya hasil;
  // kalau sudah ada pilihan, langsung tampilkan.
  function handleEnter() {
    if (selected) {
      onShow(selected.id);
      return;
    }
    const exact = results.find((r) => r.tagNumber.toLowerCase() === query.trim().toLowerCase());
    const pick = exact ?? (results.length === 1 ? results[0] : null);
    if (pick) setSelected(pick);
  }

  return (
    <Card className="mx-auto w-full max-w-2xl p-5 sm:p-6">
      <div className="mb-4 flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-tint text-primary">
          <Search className="h-5 w-5" />
        </div>
        <div>
          <h3 className="text-base font-semibold text-text">Cari Equipment</h3>
          <p className="text-sm text-text-muted">
            Ketik tag number equipment (mis. <span className="font-mono">PT-101</span>), pilih dari hasil pencarian, lalu
            tekan <span className="font-medium">Tampilkan History</span>.
          </p>
        </div>
      </div>

      <div className="relative">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
        <Input
          autoFocus
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              handleEnter();
            }
          }}
          placeholder="Tag number / nama service..."
          aria-label="Cari tag number equipment"
          aria-controls={listId}
          className="pl-8 pr-9"
        />
        {(isFetching || typing) && query.trim() !== '' && (
          <Loader2 className="absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-text-muted" />
        )}
      </div>

      <div id={listId} className="mt-3">
        {!query.trim() && (
          <p className="px-1 py-6 text-center text-sm text-text-muted">Mulai mengetik untuk mencari equipment.</p>
        )}

        {query.trim() && isError && (
          <p className="px-1 py-6 text-center text-sm text-danger">Gagal mencari equipment. Coba lagi.</p>
        )}

        {query.trim() && !isError && !typing && !isFetching && results.length === 0 && (
          <EmptyState icon={SearchX} message={`Tidak ada equipment yang cocok dengan "${query.trim()}".`} />
        )}

        {results.length > 0 && (
          <ul role="listbox" aria-label="Hasil pencarian equipment" className="max-h-72 space-y-1.5 overflow-y-auto pr-1">
            {results.map((item) => {
              const isSelected = selected?.id === item.id;
              return (
                <li key={item.id} role="presentation">
                  <button
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    onClick={() => setSelected(item)}
                    className={cn(
                      'flex w-full items-center gap-3 rounded-lg border px-3 py-2.5 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40',
                      isSelected
                        ? 'border-primary bg-primary-tint'
                        : 'border-border bg-surface hover:bg-surface-2',
                    )}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-baseline gap-x-2">
                        <span className="font-mono text-sm font-semibold text-text">{item.tagNumber}</span>
                        <span className="truncate text-sm text-text">{item.service}</span>
                      </div>
                      <div className="truncate text-xs text-text-muted">
                        {item.area.areaName} · {item.instrumentName.name}
                      </div>
                    </div>
                    <StatusBadge value={item.status} />
                    {isSelected && <Check className="h-4 w-4 shrink-0 text-primary" aria-hidden />}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
        {selected ? (
          <div className="flex min-w-0 items-center gap-2 text-sm" data-testid="selected-equipment">
            <span className="text-text-muted">Terpilih:</span>
            <span className="truncate font-mono font-semibold text-text">{selected.tagNumber}</span>
            <button
              type="button"
              onClick={() => setSelected(null)}
              aria-label="Hapus pilihan equipment"
              className="rounded p-0.5 text-text-muted hover:bg-surface-2 hover:text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ) : (
          <span className="text-sm text-text-muted">Belum ada equipment yang dipilih.</span>
        )}
        <Button onClick={() => selected && onShow(selected.id)} disabled={!selected}>
          <History className="h-4 w-4" />
          Tampilkan History
        </Button>
      </div>
    </Card>
  );
}
