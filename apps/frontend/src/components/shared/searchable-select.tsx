import { useEffect, useMemo, useRef, useState } from 'react';
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
  const containerRef = useRef<HTMLDivElement>(null);

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

  function handleSelect(option: SearchableSelectOption) {
    onChange(option.value);
    setOpen(false);
    setQuery('');
  }

  return (
    <div ref={containerRef} className={cn('relative', className)}>
      <button
        id={id}
        type="button"
        disabled={disabled}
        onClick={() => setOpen((o) => !o)}
        className={cn(
          'flex h-10 w-full items-center justify-between rounded-md border border-border bg-surface px-3 text-sm text-text disabled:cursor-not-allowed disabled:opacity-50',
          'focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40',
        )}
      >
        <span className={cn('truncate text-left', !selected && 'text-text-muted')}>
          {selected ? `${selected.label}${selected.sublabel ? ` — ${selected.sublabel}` : ''}` : placeholder}
        </span>
        <div className="flex shrink-0 items-center gap-1">
          {selected && !disabled && (
            <span
              role="button"
              tabIndex={-1}
              onClick={(e) => {
                e.stopPropagation();
                onChange('');
              }}
              className="rounded-sm p-0.5 text-text-muted hover:text-text"
            >
              <X className="h-3.5 w-3.5" />
            </span>
          )}
          <ChevronsUpDown className="h-3.5 w-3.5 text-text-muted" />
        </div>
      </button>

      {/* input hidden untuk validasi HTML native `required` pada form */}
      {required && <input tabIndex={-1} className="sr-only" value={value} required onChange={() => {}} />}

      {open && !disabled && (
        <div className="absolute z-20 mt-1 w-full rounded-md border border-border bg-surface shadow-lg">
          <div className="border-b border-border p-2">
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={searchPlaceholder ?? 'Ketik untuk mencari...'}
              className="w-full rounded-md border border-border bg-surface px-2 py-1.5 text-sm text-text placeholder:text-text-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
            />
          </div>
          <div className="max-h-56 overflow-y-auto">
            {filtered.length === 0 ? (
              <p className="p-3 text-sm text-text-muted">{emptyText}</p>
            ) : (
              filtered.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => handleSelect(option)}
                  className={cn(
                    'flex w-full flex-col items-start px-3 py-2 text-left text-sm hover:bg-surface-2',
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
