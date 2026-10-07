// Logika konversi untuk Mini Tools (halaman login). Semua fungsi murni — tanpa React,
// tanpa state — supaya mudah diuji dan dipakai ulang.

export type Quantity = 'pressure' | 'flow' | 'signal';

export interface UnitDef {
  id: string;
  label: string;
  /** Faktor ke satuan dasar: pressure → Pa, flow → m³/s (volume) atau kg/s (massa). */
  factor: number;
}

// ---------------------------------------------------------------------------
// Pressure
// ---------------------------------------------------------------------------

export const ATMOSPHERE_PA = 101_325;

export const PRESSURE_UNITS: UnitDef[] = [
  { id: 'kPa', label: 'kPa', factor: 1_000 },
  { id: 'MPa', label: 'MPa', factor: 1_000_000 },
  { id: 'Pa', label: 'Pa', factor: 1 },
  { id: 'bar', label: 'bar', factor: 100_000 },
  { id: 'mbar', label: 'mbar', factor: 100 },
  { id: 'psi', label: 'psi', factor: 6_894.757293168 },
  { id: 'kgcm2', label: 'kg/cm²', factor: 98_066.5 },
  { id: 'atm', label: 'atm', factor: ATMOSPHERE_PA },
  { id: 'mmHg', label: 'mmHg', factor: 133.322387415 },
  { id: 'inHg', label: 'inHg', factor: 3_386.38815789 },
  { id: 'mmH2O', label: 'mmH₂O', factor: 9.80665 },
  { id: 'inH2O', label: 'inH₂O', factor: 249.08891 },
];

export type PressureReference = 'gauge' | 'absolute';

export interface PressureOptions {
  /** Referensi nilai input. Default: gauge. */
  fromRef?: PressureReference;
  /** Referensi nilai hasil. Default: gauge. */
  toRef?: PressureReference;
}

function findUnit(units: UnitDef[], id: string): UnitDef {
  const unit = units.find((u) => u.id === id);
  if (!unit) throw new Error(`Satuan tidak dikenal: ${id}`);
  return unit;
}

/**
 * Konversi tekanan antar satuan. Kalau referensi berbeda (mis. barg → bara), nilai digeser
 * satu atmosfer standar (101,325 kPa). Atmosfer lokal sebenarnya bervariasi — untuk pekerjaan
 * presisi, pakai nilai barometer lapangan.
 */
export function convertPressure(value: number, from: string, to: string, options: PressureOptions = {}): number {
  const { fromRef = 'gauge', toRef = 'gauge' } = options;
  let pa = value * findUnit(PRESSURE_UNITS, from).factor;
  if (fromRef === 'gauge' && toRef === 'absolute') pa += ATMOSPHERE_PA;
  if (fromRef === 'absolute' && toRef === 'gauge') pa -= ATMOSPHERE_PA;
  return pa / findUnit(PRESSURE_UNITS, to).factor;
}

// ---------------------------------------------------------------------------
// Flow
// ---------------------------------------------------------------------------

export type FlowKind = 'volume' | 'mass';

export interface FlowUnitDef extends UnitDef {
  kind: FlowKind;
}

const M3_PER_BBL = 0.158987294928;
const M3_PER_US_GAL = 0.003785411784;
const M3_PER_FT3 = 0.028316846592;
const KG_PER_LB = 0.45359237;

export const FLOW_UNITS: FlowUnitDef[] = [
  // Volumetrik — dasar m³/s
  { id: 'm3h', label: 'm³/h', kind: 'volume', factor: 1 / 3_600 },
  { id: 'm3s', label: 'm³/s', kind: 'volume', factor: 1 },
  { id: 'm3d', label: 'm³/day', kind: 'volume', factor: 1 / 86_400 },
  { id: 'Ls', label: 'L/s', kind: 'volume', factor: 1e-3 },
  { id: 'Lmin', label: 'L/min', kind: 'volume', factor: 1e-3 / 60 },
  { id: 'Lh', label: 'L/h', kind: 'volume', factor: 1e-3 / 3_600 },
  { id: 'gpm', label: 'US gpm', kind: 'volume', factor: M3_PER_US_GAL / 60 },
  { id: 'bblh', label: 'bbl/h', kind: 'volume', factor: M3_PER_BBL / 3_600 },
  { id: 'bbld', label: 'bbl/day (BPD)', kind: 'volume', factor: M3_PER_BBL / 86_400 },
  { id: 'ft3h', label: 'ft³/h', kind: 'volume', factor: M3_PER_FT3 / 3_600 },
  { id: 'cfm', label: 'ft³/min (CFM)', kind: 'volume', factor: M3_PER_FT3 / 60 },
  { id: 'mmscfd', label: 'MMSCFD', kind: 'volume', factor: (1e6 * M3_PER_FT3) / 86_400 },
  // Massa — dasar kg/s
  { id: 'kgh', label: 'kg/h', kind: 'mass', factor: 1 / 3_600 },
  { id: 'kgs', label: 'kg/s', kind: 'mass', factor: 1 },
  { id: 'kgmin', label: 'kg/min', kind: 'mass', factor: 1 / 60 },
  { id: 'th', label: 't/h', kind: 'mass', factor: 1_000 / 3_600 },
  { id: 'td', label: 't/day', kind: 'mass', factor: 1_000 / 86_400 },
  { id: 'lbh', label: 'lb/h', kind: 'mass', factor: KG_PER_LB / 3_600 },
];

/**
 * Konversi flow. Volumetrik ↔ volumetrik dan massa ↔ massa tidak butuh densitas. Lintas jenis
 * (mis. t/h → m³/h) butuh densitas fluida kondisi operasi (kg/m³); tanpa densitas valid (> 0)
 * hasilnya `null`. Ini konversi satuan murni — kondisi standar gas (Nm³, Sm³, SCF) tidak dikoreksi.
 */
export function convertFlow(value: number, from: string, to: string, densityKgM3?: number): number | null {
  const a = findUnit(FLOW_UNITS, from) as FlowUnitDef;
  const b = findUnit(FLOW_UNITS, to) as FlowUnitDef;
  const base = value * a.factor;
  if (a.kind === b.kind) return base / b.factor;

  if (densityKgM3 === undefined || !Number.isFinite(densityKgM3) || densityKgM3 <= 0) return null;
  // volume (m³/s) × ρ = massa (kg/s); massa / ρ = volume
  const converted = a.kind === 'volume' ? base * densityKgM3 : base / densityKgM3;
  return converted / b.factor;
}

export function needsDensity(from: string, to: string): boolean {
  return (findUnit(FLOW_UNITS, from) as FlowUnitDef).kind !== (findUnit(FLOW_UNITS, to) as FlowUnitDef).kind;
}

// ---------------------------------------------------------------------------
// Signal
// ---------------------------------------------------------------------------

export interface SignalDef {
  id: string;
  label: string;
  unit: string;
  /** Nilai pada 0 % span. */
  lo: number;
  /** Nilai pada 100 % span. */
  hi: number;
}

export const SIGNALS: SignalDef[] = [
  { id: '4-20mA', label: '4–20 mA', unit: 'mA', lo: 4, hi: 20 },
  { id: '0-20mA', label: '0–20 mA', unit: 'mA', lo: 0, hi: 20 },
  { id: '1-5V', label: '1–5 V', unit: 'V', lo: 1, hi: 5 },
  { id: '0-5V', label: '0–5 V', unit: 'V', lo: 0, hi: 5 },
  { id: '0-10V', label: '0–10 V', unit: 'V', lo: 0, hi: 10 },
  { id: '3-15psi', label: '3–15 psi (pneumatik)', unit: 'psi', lo: 3, hi: 15 },
  { id: '20-100kPa', label: '20–100 kPa (pneumatik)', unit: 'kPa', lo: 20, hi: 100 },
  { id: '0.2-1bar', label: '0,2–1 bar (pneumatik)', unit: 'bar', lo: 0.2, hi: 1 },
  { id: '0-100pct', label: '0–100 %', unit: '%', lo: 0, hi: 100 },
];

export function getSignal(id: string): SignalDef {
  const signal = SIGNALS.find((s) => s.id === id);
  if (!signal) throw new Error(`Sinyal tidak dikenal: ${id}`);
  return signal;
}

/** Nilai sinyal → fraksi span (0 = 0 %, 1 = 100 %). Bisa < 0 atau > 1 untuk nilai di luar range. */
export function signalToFraction(value: number, signalId: string): number {
  const s = getSignal(signalId);
  return (value - s.lo) / (s.hi - s.lo);
}

export function fractionToSignal(fraction: number, signalId: string): number {
  const s = getSignal(signalId);
  return s.lo + fraction * (s.hi - s.lo);
}

/** Signal ↔ signal: linear, lewat persen span. Contoh: 12 mA (4–20) = 3 V (1–5) = 9 psi. */
export function convertSignal(value: number, from: string, to: string): number {
  return fractionToSignal(signalToFraction(value, from), to);
}

// ---------------------------------------------------------------------------
// Process variable (range LRV–URV) ↔ signal
// ---------------------------------------------------------------------------

export interface RangeResult {
  /** Fraksi span; 0.5 = 50 %. */
  fraction: number;
  /** Nilai pada sinyal yang dipilih. */
  signal: number;
  /** true bila di luar 0–100 % (nilai diekstrapolasi, bukan nilai saturasi transmitter). */
  outOfRange: boolean;
}

/** Nilai proses (mis. tekanan) dalam satuan yang sama dengan LRV/URV → sinyal. `null` bila URV = LRV. */
export function processToSignal(pv: number, lrv: number, urv: number, signalId: string): RangeResult | null {
  if (urv === lrv) return null;
  const fraction = (pv - lrv) / (urv - lrv);
  return { fraction, signal: fractionToSignal(fraction, signalId), outOfRange: fraction < 0 || fraction > 1 };
}

export interface ProcessFromSignalResult {
  fraction: number;
  pv: number;
  outOfRange: boolean;
}

/** Sinyal → nilai proses. Kebalikan processToSignal. `null` bila URV = LRV. */
export function signalToProcess(
  signalValue: number,
  signalId: string,
  lrv: number,
  urv: number,
): ProcessFromSignalResult | null {
  if (urv === lrv) return null;
  const fraction = signalToFraction(signalValue, signalId);
  return { fraction, pv: lrv + fraction * (urv - lrv), outOfRange: fraction < 0 || fraction > 1 };
}

// ---------------------------------------------------------------------------
// Parsing & formatting
// ---------------------------------------------------------------------------

/**
 * Parse input angka. Menerima koma atau titik sebagai desimal ("4,5" dan "4.5" sama) — user
 * Indonesia terbiasa koma. Tanda ribuan tidak didukung. String kosong / tidak valid → null.
 */
export function parseNumber(text: string): number | null {
  const normalized = text.trim().replace(',', '.');
  if (normalized === '' || normalized === '-' || normalized === '.' || normalized === '-.') return null;
  if (!/^[-+]?(\d+\.?\d*|\.\d+)(e[-+]?\d+)?$/i.test(normalized)) return null;
  const n = Number(normalized);
  return Number.isFinite(n) ? n : null;
}

const NUMBER_FORMAT = new Intl.NumberFormat('id-ID', { maximumSignificantDigits: 7 });

/** Format tampilan (locale id-ID, maks 7 digit signifikan). Sangat besar/kecil → notasi ilmiah. */
export function formatNumber(n: number | null | undefined): string {
  if (n === null || n === undefined || !Number.isFinite(n)) return '—';
  if (n === 0) return '0';
  const abs = Math.abs(n);
  if (abs >= 1e12 || abs < 1e-6) return n.toExponential(4).replace('.', ',');
  return NUMBER_FORMAT.format(n);
}

/** Format untuk disalin ke clipboard: titik desimal, tanpa pemisah ribuan. */
export function formatPlain(n: number): string {
  if (!Number.isFinite(n)) return '';
  return String(Number(n.toPrecision(10)));
}
