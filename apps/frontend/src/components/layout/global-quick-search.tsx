import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search } from 'lucide-react';

interface SearchDestination {
  to: string;
  label: string;
}

// Jujur sesuai modul yang benar-benar punya search param di backend —
// tidak ada "universal search" yang menyatukan hasil lintas modul.
const DESTINATIONS: SearchDestination[] = [
  { to: '/maintenance', label: 'Corrective Maintenance (No. e-SPK)' },
  { to: '/equipment', label: 'Equipment (Tag Number)' },
  { to: '/areas', label: 'Area' },
];

export function GlobalQuickSearch() {
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const [value, setValue] = useState('');
  const [open, setOpen] = useState(false);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      const isMod = e.metaKey || e.ctrlKey;
      if (isMod && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
        inputRef.current?.select();
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  function goTo(to: string) {
    const q = value.trim();
    if (!q) return;
    navigate(`${to}?search=${encodeURIComponent(q)}`);
    setValue('');
    setOpen(false);
    inputRef.current?.blur();
  }

  const showDropdown = open && value.trim().length > 0;

  return (
    <div className="relative hidden w-full max-w-sm flex-1 md:block">
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 120)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') goTo(DESTINATIONS[0].to);
          if (e.key === 'Escape') inputRef.current?.blur();
        }}
        placeholder="Cari tag, e-SPK, area..."
        className="h-9 w-full rounded-lg border border-border bg-surface-2 pl-9 pr-12 text-sm text-text placeholder:text-text-muted transition-colors focus:border-primary focus:bg-surface focus:outline-none focus:ring-1 focus:ring-primary/30"
      />
      <kbd className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 rounded border border-border bg-surface px-1.5 py-0.5 text-[10px] font-medium text-text-muted">
        ⌘K
      </kbd>

      {showDropdown && (
        <div className="absolute left-0 right-0 top-full z-50 mt-1 rounded-lg border border-border bg-surface p-1 shadow-card-hover">
          {DESTINATIONS.map((d) => (
            <button
              key={d.to}
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                goTo(d.to);
              }}
              className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm text-text hover:bg-surface-2"
            >
              <Search className="h-3.5 w-3.5 shrink-0 text-text-muted" />
              <span className="truncate">{`Cari "${value}" di ${d.label}`}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
