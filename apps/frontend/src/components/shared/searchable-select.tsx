import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { ChevronsUpDown, X } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface SearchableSelectOption {
  value: string;
  label: string;
  sublabel?: string;
}

interface Props {
  id?: string;
  options: SearchableSelectOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyText?: string;
  required?: boolean;
  disabled?: boolean;
  className?: string;
}

/**
 * Dropdown dengan search — pengganti native <select> untuk daftar panjang
 * (mis. Equipment yang jumlahnya sudah ratusan). Ketik untuk filter by label,
 * klik salah satu baris untuk pilih. Daftar tampil sebagai panel di bawah
 * input (bukan overlay melayang) supaya tidak terpotong overflow dialog.
 *
 * Aksesibilitas (sebelumnya TIDAK ADA sama sekali — temuan audit UI/UX High):
 * - Trigger punya `role="combobox"` + `aria-expanded`/`aria-controls` standar ARIA combobox.
 * - Panel hasil adalah `role="listbox"`, tiap baris `role="option"` + `aria-selected`.
 * - Keyboard penuh: Enter/Space/ArrowDown pada trigger membuka panel & fokus ke search;
 *   ArrowUp/ArrowDown menavigasi highlight; Enter memilih baris yang di-highlight;
 *   Escape menutup panel dan mengembalikan fokus ke trigger.
 * - Tombol clear sekarang `<button tabIndex={0}>` sungguhan (sebelumnya `tabIndex={-1}`,
 *   dihapus total dari tab order — tidak bisa dioperasikan tanpa mouse).
 *
 * Catatan HTML validity (Technical Debt Risk #13): trigger-nya sengaja BUKAN elemen
 * `<button>` native — dulu sempat begitu, tapi tombol "Hapus pilihan" perlu hidup di
 * dalam area trigger yang sama secara visual, dan `<button>` di dalam `<button>` adalah
 * HTML tidak valid (browser boleh auto-close tag lebih awal dari yang diharapkan).
 * Jadi trigger-nya `<div role="combobox" tabIndex={0}>` — perilaku keyboard/fokus
 * dijaga manual (tabIndex, onKeyDown, focus-visible ring) supaya tetap setara `<button>`.
 */
export function SearchableSelect({
  id,
  options,
  value,
  onChange,
  placeholder = 'Cari & pilih...',
  searchPlaceholder,
  emptyText = 'Tidak ada yang cocok.',
  required,
  disabled,
  className,
}: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const listboxId = useId();

  const selected = options.find((o) => o.value === value) ?? null;

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setQuery('');
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter(
      (o) => o.label.toLowerCase().includes(q) || o.sublabel?.toLowerCase().includes(q),
    );
  }, [options, query]);

  // Highlight selalu tetap dalam batas daftar hasil filter saat ini — kalau
  // query berubah dan baris yang di-highlight sebelumnya sudah tidak ada,
  // kembali ke baris pertama daripada highlight "hilang"/index invalid.
  useEffect(() => {
    setHighlightedIndex((i) => (i >= filtered.length ? 0 : i));
  }, [filtered.length]);

  function openPanel() {
    if (disabled) return;
    const initialIndex = selected ? Math.max(filtered.findIndex((o) => o.value === selected.value), 0) : 0;
    setHighlightedIndex(initialIndex);
    setOpen(true);
    // Fokus pindah ke search box setelah panel ter-render.
    requestAnimationFrame(() => searchInputRef.current?.focus());
  }

  function closePanel(returnFocus: boolean) {
    setOpen(false);
    setQuery('');
    if (returnFocus) {
      triggerRef.current?.focus();
    }
  }

  function handleSelect(option: SearchableSelectOption) {
    onChange(option.value);
    closePanel(true);
  }

  function handleTriggerKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    if (disabled) return;
    if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      openPanel();
    }
  }

  function handleSearchKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex((i) => Math.min(i + 1, filtered.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const option = filtered[highlightedIndex];
      if (option) handleSelect(option);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      closePanel(true);
    } else if (e.key === 'Tab') {
      closePanel(false);
    }
  }

  return (
    <div ref={containerRef} className={cn('relative', className)}>
      <div
        ref={triggerRef}
        id={id}
        role="combobox"
        tabIndex={disabled ? -1 : 0}
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-controls={listboxId}
        aria-disabled={disabled}
        onClick={() => {
          if (disabled) return;
          open ? closePanel(false) : openPanel();
        }}
        onKeyDown={handleTriggerKeyDown}
        className={cn(
          'flex h-10 w-full cursor-pointer items-center justify-between rounded-md border border-border bg-surface px-3 text-sm text-text',
          disabled && 'cursor-not-allowed opacity-50',
          'focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40',
        )}
      >
        <span className={cn('truncate text-left', !selected && 'text-text-muted')}>
          {selected ? `${selected.label}${selected.sublabel ? ` — ${selected.sublabel}` : ''}` : placeholder}
        </span>
        <div className="flex shrink-0 items-center gap-1">
          {selected && !disabled && (
            <button
              type="button"
              aria-label="Hapus pilihan"
              onClick={(e) => {
                e.stopPropagation();
                onChange('');
              }}
              onKeyDown={(e) => e.stopPropagation()}
              className="rounded-sm p-0.5 text-text-muted hover:text-text focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
          <ChevronsUpDown className="h-3.5 w-3.5 text-text-muted" />
        </div>
      </div>

      {/* input hidden untuk validasi HTML native `required` pada form */}
      {required && <input tabIndex={-1} className="sr-only" value={value} required onChange={() => {}} />}

      {open && !disabled && (
        <div className="absolute z-20 mt-1 w-full rounded-md border border-border bg-surface shadow-lg">
          <div className="border-b border-border p-2">
            <input
              ref={searchInputRef}
              role="combobox"
              aria-expanded
              aria-controls={listboxId}
              aria-activedescendant={filtered[highlightedIndex] ? `${listboxId}-${filtered[highlightedIndex].value}` : undefined}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleSearchKeyDown}
              placeholder={searchPlaceholder ?? 'Ketik untuk mencari...'}
              className="w-full rounded-md border border-border bg-surface px-2 py-1.5 text-sm text-text placeholder:text-text-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
            />
          </div>
          <div id={listboxId} role="listbox" className="max-h-56 overflow-y-auto">
            {filtered.length === 0 ? (
              <p className="p-3 text-sm text-text-muted">{emptyText}</p>
            ) : (
              filtered.map((option, index) => (
                <button
                  key={option.value}
                  id={`${listboxId}-${option.value}`}
                  role="option"
                  aria-selected={option.value === value}
                  type="button"
                  onMouseEnter={() => setHighlightedIndex(index)}
                  onClick={() => handleSelect(option)}
                  className={cn(
                    'flex w-full flex-col items-start px-3 py-2 text-left text-sm',
                    index === highlightedIndex ? 'bg-surface-2' : 'hover:bg-surface-2',
                    option.value === value && 'bg-primary-tint',
                  )}
                >
                  <span className="text-text">{option.label}</span>
                  {option.sublabel && <span className="text-xs text-text-muted">{option.sublabel}</span>}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
