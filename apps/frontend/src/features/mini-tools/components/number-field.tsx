import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { parseNumber } from '../utils/conversion';

interface NumberFieldProps {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  /** Satuan yang ditampilkan di ujung kanan input. */
  suffix?: string;
  placeholder?: string;
  className?: string;
}

// Input teks (bukan type="number") supaya koma desimal ("4,5") yang lazim diketik user
// Indonesia ikut diterima — <input type="number"> menolaknya di sebagian locale/browser.
export function NumberField({ id, label, value, onChange, suffix, placeholder, className }: NumberFieldProps) {
  const invalid = value.trim() !== '' && parseNumber(value) === null;
  return (
    <div className={className}>
      <Label htmlFor={id}>{label}</Label>
      <div className="relative">
        <Input
          id={id}
          type="text"
          inputMode="decimal"
          autoComplete="off"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder ?? '0'}
          aria-invalid={invalid || undefined}
          className={cn(suffix && 'pr-14', invalid && 'border-danger focus-visible:ring-danger/40')}
        />
        {suffix && (
          <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs text-text-muted">
            {suffix}
          </span>
        )}
      </div>
      {invalid && <p className="mt-1 text-xs text-danger">Bukan angka yang valid</p>}
    </div>
  );
}
