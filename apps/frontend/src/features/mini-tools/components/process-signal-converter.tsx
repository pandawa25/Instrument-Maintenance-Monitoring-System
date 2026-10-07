import { useMemo, useState } from 'react';
import { AlertTriangle, ArrowRightLeft } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import {
  PRESSURE_UNITS,
  SIGNALS,
  fractionToSignal,
  formatNumber,
  getSignal,
  parseNumber,
  processToSignal,
  signalToProcess,
} from '../utils/conversion';
import { NumberField } from './number-field';
import { ResultCard } from './result-card';

type Direction = 'toSignal' | 'toProcess';

const DIRECTIONS: { value: Direction; label: string }[] = [
  { value: 'toSignal', label: 'Pressure → Signal' },
  { value: 'toProcess', label: 'Signal → Pressure' },
];

// Pressure (range LRV–URV) ↔ sinyal transmitter. Linear; range reverse (LRV > URV) ikut didukung.
export function ProcessSignalConverter() {
  const [direction, setDirection] = useState<Direction>('toSignal');
  const [lrv, setLrv] = useState('0');
  const [urv, setUrv] = useState('10');
  const [unit, setUnit] = useState('bar');
  const [signalId, setSignalId] = useState('4-20mA');
  const [pvText, setPvText] = useState('5');
  const [sigText, setSigText] = useState('12');

  const signal = getSignal(signalId);
  const unitLabel = PRESSURE_UNITS.find((u) => u.id === unit)?.label ?? unit;

  const lrvN = parseNumber(lrv);
  const urvN = parseNumber(urv);
  const rangeValid = lrvN !== null && urvN !== null;
  const zeroSpan = rangeValid && lrvN === urvN;

  const computed = useMemo(() => {
    if (!rangeValid || zeroSpan) return null;
    if (direction === 'toSignal') {
      const pv = parseNumber(pvText);
      if (pv === null) return null;
      const r = processToSignal(pv, lrvN, urvN, signalId);
      return r && { fraction: r.fraction, primary: r.signal, outOfRange: r.outOfRange };
    }
    const sig = parseNumber(sigText);
    if (sig === null) return null;
    const r = signalToProcess(sig, signalId, lrvN, urvN);
    return r && { fraction: r.fraction, primary: r.pv, outOfRange: r.outOfRange };
  }, [rangeValid, zeroSpan, direction, pvText, sigText, lrvN, urvN, signalId]);

  return (
    <div className="space-y-3">
      <div role="group" aria-label="Arah konversi" className="grid grid-cols-2 gap-1 rounded-md bg-surface-2 p-1">
        {DIRECTIONS.map((d) => (
          <button
            key={d.value}
            type="button"
            aria-pressed={direction === d.value}
            onClick={() => setDirection(d.value)}
            className={cn(
              'flex items-center justify-center gap-1 rounded px-2 py-1.5 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40',
              direction === d.value ? 'bg-surface text-primary shadow-soft' : 'text-text-muted hover:text-text',
            )}
          >
            {d.label}
          </button>
        ))}
      </div>

      <fieldset className="space-y-2 rounded-md border border-border p-2.5">
        <legend className="flex items-center gap-1 px-1 text-xs font-medium text-text-muted">
          <ArrowRightLeft className="h-3 w-3" /> Range transmitter
        </legend>
        <div className="grid grid-cols-3 gap-2">
          <NumberField id="mt-ps-lrv" label={`LRV (${formatNumber(signal.lo)} ${signal.unit})`} value={lrv} onChange={setLrv} />
          <NumberField id="mt-ps-urv" label={`URV (${formatNumber(signal.hi)} ${signal.unit})`} value={urv} onChange={setUrv} />
          <div>
            <Label htmlFor="mt-ps-unit">Satuan</Label>
            <Select id="mt-ps-unit" value={unit} onChange={(e) => setUnit(e.target.value)}>
              {PRESSURE_UNITS.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.label}
                </option>
              ))}
            </Select>
          </div>
        </div>
        {zeroSpan && <p className="text-xs text-danger">URV harus berbeda dari LRV.</p>}
        {lrvN !== null && urvN !== null && lrvN > urvN && (
          <p className="text-xs text-text-muted">Range reverse (LRV &gt; URV) — dihitung linear.</p>
        )}
      </fieldset>

      <div>
        <Label htmlFor="mt-ps-signal">Jenis sinyal</Label>
        <Select id="mt-ps-signal" value={signalId} onChange={(e) => setSignalId(e.target.value)}>
          {SIGNALS.map((s) => (
            <option key={s.id} value={s.id}>
              {s.label}
            </option>
          ))}
        </Select>
      </div>

      {direction === 'toSignal' ? (
        <NumberField id="mt-ps-pv" label="Tekanan terukur" value={pvText} onChange={setPvText} suffix={unitLabel} />
      ) : (
        <NumberField id="mt-ps-sig" label="Nilai sinyal" value={sigText} onChange={setSigText} suffix={signal.unit} />
      )}

      <div className="grid grid-cols-[3fr_2fr] gap-2">
        <ResultCard
          label={direction === 'toSignal' ? 'Sinyal output' : 'Tekanan'}
          value={computed?.primary ?? null}
          unit={direction === 'toSignal' ? signal.unit : unitLabel}
        />
        <ResultCard compact label="% span" value={computed ? computed.fraction * 100 : null} unit="%" />
      </div>

      {computed?.outOfRange && (
        <p role="status" className="flex items-start gap-1.5 text-xs text-warning">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          Di luar range 0–100 %. Nilai diekstrapolasi; transmitter sebenarnya biasanya saturasi (≈3,8–20,5 mA).
        </p>
      )}

      {computed && (
        <div>
          <div className="mb-1 text-xs font-medium text-text-muted">Setara pada sinyal lain</div>
          <dl className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
            {SIGNALS.map((s) => (
              <div key={s.id} className="flex items-baseline justify-between gap-2 border-b border-border/60 py-0.5">
                <dt className="truncate text-text-muted">{s.label.replace(/ \(pneumatik\)/, '')}</dt>
                <dd className="font-mono text-text">
                  {formatNumber(fractionToSignal(computed.fraction, s.id))} {s.unit}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      )}
    </div>
  );
}
