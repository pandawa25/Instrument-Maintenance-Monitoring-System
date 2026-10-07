import { useEffect, useRef, useState } from 'react';
import { Check, Copy } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatNumber, formatPlain } from '../utils/conversion';

interface ResultCardProps {
  label: string;
  value: number | null;
  unit: string;
  /** Tampilan kecil (hasil sekunder) tanpa tombol salin. */
  compact?: boolean;
  className?: string;
}

export function ResultCard({ label, value, unit, compact, className }: ResultCardProps) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>();
  useEffect(() => () => clearTimeout(timer.current), []);

  async function copy() {
    if (value === null || !Number.isFinite(value)) return;
    try {
      await navigator.clipboard.writeText(formatPlain(value));
      setCopied(true);
      clearTimeout(timer.current);
      timer.current = setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard bisa diblokir (HTTP non-secure / izin ditolak) — abaikan, nilai tetap terbaca di layar.
    }
  }

  return (
    <div className={cn('rounded-md border border-border bg-surface-2 px-3 py-2', className)}>
      <div className="text-xs text-text-muted">{label}</div>
      <div className="flex items-baseline justify-between gap-2">
        <div className="min-w-0 truncate" aria-live="polite">
          <span className={cn('font-mono font-semibold text-text', compact ? 'text-base' : 'text-xl')}>
            {formatNumber(value)}
          </span>
          {value !== null && <span className="ml-1.5 text-sm text-text-muted">{unit}</span>}
        </div>
        {!compact && (
          <button
            type="button"
            onClick={copy}
            disabled={value === null}
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-text-muted hover:bg-surface-3 hover:text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 disabled:opacity-40"
            aria-label={copied ? 'Tersalin' : 'Salin hasil'}
            title="Salin hasil"
          >
            {copied ? <Check className="h-4 w-4 text-success" /> : <Copy className="h-4 w-4" />}
          </button>
        )}
      </div>
    </div>
  );
}
