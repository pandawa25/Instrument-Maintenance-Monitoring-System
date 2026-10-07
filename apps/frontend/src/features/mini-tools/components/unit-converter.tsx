import { useMemo, useState } from 'react';
import { ArrowDownUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import {
  FLOW_UNITS,
  PRESSURE_UNITS,
  convertFlow,
  convertPressure,
  convertSignal,
  flowCompatibility,
  getSignal,
  parseNumber,
  type PressureReference,
  type Quantity,
} from '../utils/conversion';
import { NumberField } from './number-field';
import { ResultCard } from './result-card';
import { UnitOptions } from './unit-options';

const QUANTITIES: { value: Quantity; label: string }[] = [
  { value: 'pressure', label: 'Pressure' },
  { value: 'flow', label: 'Flow' },
  { value: 'signal', label: 'Signal' },
];

interface Pair {
  from: string;
  to: string;
}

const DEFAULT_PAIRS: Record<Quantity, Pair> = {
  pressure: { from: 'bar', to: 'psi' },
  flow: { from: 'm3h', to: 'Lmin' },
  signal: { from: '4-20mA', to: '1-5V' },
};

const DEFAULT_VALUES: Record<Quantity, string> = { pressure: '1', flow: '1', signal: '12' };

function unitLabel(quantity: Quantity, id: string): string {
  if (quantity === 'signal') return getSignal(id).unit;
  const list = quantity === 'pressure' ? PRESSURE_UNITS : FLOW_UNITS;
  return list.find((u) => u.id === id)?.label ?? id;
}

// Satu kartu konverter untuk tiga besaran sejenis (pressure→pressure, flow→flow,
// signal→signal). Nilai & pilihan satuan disimpan per besaran, jadi berpindah tab
// besaran tidak mereset isian.
export function UnitConverter() {
  const [quantity, setQuantity] = useState<Quantity>('pressure');
  const [values, setValues] = useState<Record<Quantity, string>>(DEFAULT_VALUES);
  const [pairs, setPairs] = useState<Record<Quantity, Pair>>(DEFAULT_PAIRS);
  const [fromRef, setFromRef] = useState<PressureReference>('gauge');
  const [toRef, setToRef] = useState<PressureReference>('gauge');
  const [density, setDensity] = useState('1000');

  const pair = pairs[quantity];
  const valueText = values[quantity];
  const compatibility = quantity === 'flow' ? flowCompatibility(pair.from, pair.to) : 'direct';
  const densityNeeded = compatibility === 'needs-density';
  const involvesGas =
    quantity === 'flow' && [pair.from, pair.to].some((id) => FLOW_UNITS.find((u) => u.id === id)?.kind === 'gas');

  const result = useMemo(() => {
    const n = parseNumber(valueText);
    if (n === null) return null;
    if (quantity === 'pressure') return convertPressure(n, pair.from, pair.to, { fromRef, toRef });
    if (quantity === 'signal') return convertSignal(n, pair.from, pair.to);
    return convertFlow(n, pair.from, pair.to, densityNeeded ? (parseNumber(density) ?? undefined) : undefined);
  }, [quantity, valueText, pair.from, pair.to, fromRef, toRef, density, densityNeeded]);

  function setPair(next: Partial<Pair>) {
    setPairs((p) => ({ ...p, [quantity]: { ...p[quantity], ...next } }));
  }

  return (
    <div className="space-y-3">
      {/* Segmented control besaran */}
      <div role="group" aria-label="Jenis besaran" className="grid grid-cols-3 gap-1 rounded-md bg-surface-2 p-1">
        {QUANTITIES.map((q) => (
          <button
            key={q.value}
            type="button"
            aria-pressed={quantity === q.value}
            onClick={() => setQuantity(q.value)}
            className={cn(
              'rounded px-2 py-1.5 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40',
              quantity === q.value ? 'bg-surface text-primary shadow-soft' : 'text-text-muted hover:text-text',
            )}
          >
            {q.label}
          </button>
        ))}
      </div>

      <NumberField
        id="mt-uc-value"
        label="Nilai"
        value={valueText}
        onChange={(v) => setValues((s) => ({ ...s, [quantity]: v }))}
        suffix={unitLabel(quantity, pair.from)}
      />

      <div className="grid grid-cols-[1fr_auto_1fr] items-end gap-2">
        <div>
          <Label htmlFor="mt-uc-from">Dari</Label>
          <Select id="mt-uc-from" value={pair.from} onChange={(e) => setPair({ from: e.target.value })}>
            <UnitOptions quantity={quantity} />
          </Select>
        </div>
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={() => setPair({ from: pair.to, to: pair.from })}
          aria-label="Tukar satuan"
          title="Tukar satuan"
        >
          <ArrowDownUp className="h-4 w-4" />
        </Button>
        <div>
          <Label htmlFor="mt-uc-to">Ke</Label>
          <Select id="mt-uc-to" value={pair.to} onChange={(e) => setPair({ to: e.target.value })}>
            <UnitOptions quantity={quantity} />
          </Select>
        </div>
      </div>

      {quantity === 'pressure' && (
        <div className="grid grid-cols-2 gap-2">
          <div>
            <Label htmlFor="mt-uc-fromref">Referensi input</Label>
            <Select id="mt-uc-fromref" value={fromRef} onChange={(e) => setFromRef(e.target.value as PressureReference)}>
              <option value="gauge">Gauge (g)</option>
              <option value="absolute">Absolut (a)</option>
            </Select>
          </div>
          <div>
            <Label htmlFor="mt-uc-toref">Referensi hasil</Label>
            <Select id="mt-uc-toref" value={toRef} onChange={(e) => setToRef(e.target.value as PressureReference)}>
              <option value="gauge">Gauge (g)</option>
              <option value="absolute">Absolut (a)</option>
            </Select>
          </div>
        </div>
      )}

      {densityNeeded && (
        <div>
          <NumberField id="mt-uc-density" label="Densitas fluida (kondisi operasi)" value={density} onChange={setDensity} suffix="kg/m³" />
          {result === null && parseNumber(valueText) !== null && (
            <p className="mt-1 text-xs text-warning">Isi densitas (&gt; 0) untuk konversi massa ↔ volume.</p>
          )}
        </div>
      )}

      {compatibility === 'unsupported' && (
        <p role="status" className="text-xs text-warning">
          Gas standar hanya bisa dikonversi ke satuan gas standar lain. Ke volume aktual (m³/h) butuh tekanan, suhu, dan
          faktor kompresibilitas operasi; ke massa butuh densitas standar.
        </p>
      )}

      <ResultCard label="Hasil" value={result} unit={unitLabel(quantity, pair.to)} />

      {quantity === 'pressure' && fromRef !== toRef && (
        <p className="text-xs text-text-muted">Gauge ↔ absolut memakai atmosfer standar 101,325 kPa; pakai barometer lapangan bila perlu presisi.</p>
      )}
      {involvesGas && (
        <p className="text-xs text-text-muted">
          Kondisi standar: Nm³ = 0 °C, Sm³ = 15 °C (keduanya 1,01325 bar), SCF = 60 °F &amp; 14,696 psia. Dikonversi dengan
          koreksi suhu/tekanan (gas ideal) — cek definisi pada kontrak Anda.
        </p>
      )}
      {quantity === 'signal' && (
        <p className="text-xs text-text-muted">Linear lewat persen span. Nilai di luar range (mis. 3,8 mA) diekstrapolasi.</p>
      )}
    </div>
  );
}
