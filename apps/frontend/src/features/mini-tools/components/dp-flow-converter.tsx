import { useMemo, useState } from 'react';
import { AlertTriangle, Radical } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import {
  FLOW_UNITS,
  PRESSURE_UNITS,
  dpToFlow,
  flowToDp,
  formatNumber,
  fractionToSignal,
  getSignal,
  parseNumber,
  type DpFlowFailure,
  type DpFlowResult,
} from '../utils/conversion';
import { NumberField } from './number-field';
import { ResultCard } from './result-card';
import { FlowOptions, PressureOptions, SignalOptions } from './unit-options';

type Direction = 'toFlow' | 'toDp';

const DIRECTIONS: { value: Direction; label: string }[] = [
  { value: 'toFlow', label: 'Pressure → Flow' },
  { value: 'toDp', label: 'Flow → Pressure' },
];

const FAILURE_MESSAGES: Record<DpFlowFailure, string> = {
  'zero-span': 'URV harus berbeda dari LRV.',
  'invalid-flow-max': 'Flow maksimum harus lebih besar dari 0.',
  'negative-dp': 'DP di bawah LRV — akar kuadrat tidak terdefinisi (flow dianggap nol / aliran balik).',
  'negative-flow': 'Flow tidak boleh negatif.',
};

// Flow dari elemen primer differential pressure (orifice, venturi, dst): flow ∝ √DP.
// Pressure di sini = differential pressure (ΔP) di range transmitter.
export function DpFlowConverter() {
  const [direction, setDirection] = useState<Direction>('toFlow');
  const [lrv, setLrv] = useState('0');
  const [urv, setUrv] = useState('250');
  const [dpUnit, setDpUnit] = useState('mbar');
  const [flowMax, setFlowMax] = useState('100');
  const [flowUnit, setFlowUnit] = useState('m3h');
  const [signalId, setSignalId] = useState('4-20mA');
  const [dpText, setDpText] = useState('62,5');
  const [flowText, setFlowText] = useState('50');

  const signal = getSignal(signalId);
  const dpLabel = PRESSURE_UNITS.find((u) => u.id === dpUnit)?.label ?? dpUnit;
  const flowLabel = FLOW_UNITS.find((u) => u.id === flowUnit)?.label ?? flowUnit;

  const result: DpFlowResult | null = useMemo(() => {
    const lrvN = parseNumber(lrv);
    const urvN = parseNumber(urv);
    const maxN = parseNumber(flowMax);
    const input = parseNumber(direction === 'toFlow' ? dpText : flowText);
    if (lrvN === null || urvN === null || maxN === null || input === null) return null;
    return direction === 'toFlow' ? dpToFlow(input, lrvN, urvN, maxN) : flowToDp(input, maxN, lrvN, urvN);
  }, [direction, lrv, urv, flowMax, dpText, flowText]);

  const ok = result?.ok ? result : null;

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
              'rounded px-2 py-1.5 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40',
              direction === d.value ? 'bg-surface text-primary shadow-soft' : 'text-text-muted hover:text-text',
            )}
          >
            {d.label}
          </button>
        ))}
      </div>

      <fieldset className="space-y-2 rounded-md border border-border p-2.5">
        <legend className="flex items-center gap-1 px-1 text-xs font-medium text-text-muted">
          <Radical className="h-3 w-3" /> Range DP transmitter
        </legend>
        <div className="grid grid-cols-3 gap-2">
          <NumberField id="mt-df-lrv" label="LRV (flow 0 %)" value={lrv} onChange={setLrv} />
          <NumberField id="mt-df-urv" label="URV (flow 100 %)" value={urv} onChange={setUrv} />
          <div>
            <Label htmlFor="mt-df-dpunit">Satuan DP</Label>
            <Select id="mt-df-dpunit" value={dpUnit} onChange={(e) => setDpUnit(e.target.value)}>
              <PressureOptions />
            </Select>
          </div>
        </div>
      </fieldset>

      <fieldset className="space-y-2 rounded-md border border-border p-2.5">
        <legend className="px-1 text-xs font-medium text-text-muted">Flow pada 100 % span</legend>
        <div className="grid grid-cols-[2fr_3fr] gap-2">
          <NumberField id="mt-df-max" label="Flow maksimum" value={flowMax} onChange={setFlowMax} />
          <div>
            <Label htmlFor="mt-df-flowunit">Satuan flow</Label>
            <Select id="mt-df-flowunit" value={flowUnit} onChange={(e) => setFlowUnit(e.target.value)}>
              <FlowOptions />
            </Select>
          </div>
        </div>
      </fieldset>

      {direction === 'toFlow' ? (
        <NumberField id="mt-df-dp" label="DP terukur" value={dpText} onChange={setDpText} suffix={dpLabel} />
      ) : (
        <NumberField id="mt-df-flow" label="Flow" value={flowText} onChange={setFlowText} suffix={flowLabel} />
      )}

      <ResultCard
        label={direction === 'toFlow' ? 'Flow' : 'Differential pressure (DP)'}
        value={ok ? ok.value : null}
        unit={direction === 'toFlow' ? flowLabel : dpLabel}
      />
      <div className="grid grid-cols-2 gap-2">
        <ResultCard compact label="% flow" value={ok ? ok.flowFraction * 100 : null} unit="%" />
        <ResultCard compact label="% span DP" value={ok ? ok.dpFraction * 100 : null} unit="%" />
      </div>

      {result && !result.ok && (
        <p role="alert" className="text-xs text-danger">
          {FAILURE_MESSAGES[result.reason]}
        </p>
      )}
      {ok?.outOfRange && (
        <p role="status" className="flex items-start gap-1.5 text-xs text-warning">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          Di atas 100 % — melebihi flow maksimum / URV; nilai diekstrapolasi.
        </p>
      )}

      <div>
        <Label htmlFor="mt-df-signal">Sinyal output transmitter</Label>
        <Select id="mt-df-signal" value={signalId} onChange={(e) => setSignalId(e.target.value)}>
          <SignalOptions />
        </Select>
      </div>
      {ok && (
        <dl className="space-y-1 text-xs">
          <div className="flex items-baseline justify-between gap-2 border-b border-border/60 py-0.5">
            <dt className="text-text-muted">Output linear terhadap DP</dt>
            <dd className="font-mono text-text">
              {formatNumber(fractionToSignal(ok.dpFraction, signalId))} {signal.unit}
            </dd>
          </div>
          <div className="flex items-baseline justify-between gap-2 border-b border-border/60 py-0.5">
            <dt className="text-text-muted">Output dengan akar kuadrat (∝ flow)</dt>
            <dd className="font-mono text-text">
              {formatNumber(fractionToSignal(ok.flowFraction, signalId))} {signal.unit}
            </dd>
          </div>
        </dl>
      )}

      <p className="text-xs text-text-muted">
        Flow ∝ √DP; flow 0 pada LRV dan 100 % pada URV. Densitas, koefisien discharge, dan ekspansi dianggap konstan.
      </p>
    </div>
  );
}
