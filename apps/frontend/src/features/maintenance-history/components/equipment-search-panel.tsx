import { useId, useState } from 'react';
import { Check, History, Loader2, Search, SearchX, TrendingUp, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { EmptyState } from '@/components/shared/empty-state';
import { StatusBadge } from '@/components/shared/status-badge';
import { useDebouncedValue } from '@/lib/use-debounced-value';
import { cn } from '@/lib/utils';
import { useHistoryEquipmentSearch, useTopMaintenanceEquipment } from '../hooks/use-maintenance-history';
import { formatDate } from '../utils/format';
import type { HistoryEquipmentOption, TopMaintenanceEquipment } from '../types/maintenance-history.types';

interface Props {
  onShow: (equipmentId: string) => void;
}

// Halaman awal History Maintenance. Kolom pencarian selalu di atas. Saat kolom kosong, isinya
// 10 equipment dengan maintenance terbanyak (klik langsung membuka history-nya) — halaman tidak
// pernah kosong. Saat mengetik, isinya hasil pencarian: pilih satu -> "Tampilkan History".
// History TIDAK dimuat sebelum equipment dipilih.
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
  const top = useTopMaintenanceEquipment(10);

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
            Ketik tag number equipment (mis. <span className="font-mono">PT-101</span>) lalu pilih dari hasil, atau
            langsung pilih dari equipment dengan maintenance terbanyak di bawah.
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
          <TopEquipmentList
            items={top.data}
            isLoading={top.isLoading}
            isError={top.isError}
            onRetry={() => top.refetch()}
            onShow={onShow}
          />
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

interface TopListProps {
  items: TopMaintenanceEquipment[] | undefined;
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
  onShow: (equipmentId: string) => void;
}

/** Top 10 equipment menurut jumlah kegiatan maintenance (Corrective + Preventive Completed, semua waktu). */
function TopEquipmentList({ items, isLoading, isError, onRetry, onShow }: TopListProps) {
  const max = Math.max(1, ...(items ?? []).map((i) => i.totalCount));

  return (
    <section aria-label="Equipment dengan maintenance terbanyak">
      <div className="mb-2 flex items-center gap-1.5 px-1 text-xs font-medium uppercase tracking-wide text-text-muted">
        <TrendingUp className="h-3.5 w-3.5" aria-hidden />
        10 equipment dengan maintenance terbanyak
        <span className="font-normal normal-case tracking-normal">(CM + PM, semua waktu)</span>
      </div>

      {isLoading && (
        <p className="flex items-center justify-center gap-2 px-1 py-6 text-sm text-text-muted">
          <Loader2 className="h-4 w-4 animate-spin" /> Memuat daftar...
        </p>
      )}

      {isError && (
        <div className="px-1 py-6 text-center text-sm">
          <p className="text-danger">Gagal memuat daftar equipment teratas.</p>
          <button type="button" onClick={onRetry} className="mt-1 text-primary underline-offset-2 hover:underline">
            Coba lagi
          </button>
        </div>
      )}

      {!isLoading && !isError && items && items.length === 0 && (
        <p className="px-1 py-6 text-center text-sm text-text-muted">
          Belum ada data maintenance. Ketik tag number untuk mencari equipment.
        </p>
      )}

      {items && items.length > 0 && (
        <ol className="space-y-1.5">
          {items.map((item) => (
            <li key={item.id}>
              <button
                type="button"
                onClick={() => onShow(item.id)}
                aria-label={`Buka history ${item.tagNumber}`}
                className="group flex w-full items-center gap-3 rounded-lg border border-border bg-surface px-3 py-2.5 text-left transition-colors hover:bg-surface-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
              >
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary-tint text-xs font-semibold text-primary">
                  {item.rank}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-baseline gap-x-2">
                    <span className="font-mono text-sm font-semibold text-text">{item.tagNumber}</span>
                    <span className="truncate text-sm text-text">{item.service}</span>
                  </div>
                  <div className="truncate text-xs text-text-muted">
                    {item.area.areaName} · {item.instrumentName.name}
                    {item.lastMaintenanceDate && <> · terakhir {formatDate(item.lastMaintenanceDate)}</>}
                  </div>
                  <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-surface-2" aria-hidden>
                    <div className="h-full rounded-full bg-primary/70" style={{ width: `${(item.totalCount / max) * 100}%` }} />
                  </div>
                </div>
                <div className="shrink-0 text-right">
                  <div className="text-base font-semibold leading-none text-text">{item.totalCount}</div>
                  <div className="mt-1 text-[11px] text-text-muted">
                    CM {item.correctiveCount} · PM {item.preventiveCount}
                  </div>
                </div>
              </button>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
