import { describe, expect, it } from 'vitest';
import {
  convertFlow,
  convertPressure,
  convertSignal,
  formatNumber,
  formatPlain,
  needsDensity,
  parseNumber,
  processToSignal,
  signalToProcess,
} from './conversion';

describe('convertPressure', () => {
  it('konversi satuan umum', () => {
    expect(convertPressure(1, 'bar', 'psi')).toBeCloseTo(14.5038, 4);
    expect(convertPressure(1, 'bar', 'kPa')).toBeCloseTo(100, 6);
    expect(convertPressure(1, 'kgcm2', 'bar')).toBeCloseTo(0.980665, 6);
    expect(convertPressure(1, 'atm', 'bar')).toBeCloseTo(1.01325, 6);
    expect(convertPressure(100, 'psi', 'MPa')).toBeCloseTo(0.689476, 6);
    expect(convertPressure(760, 'mmHg', 'atm')).toBeCloseTo(1, 4);
    expect(convertPressure(1000, 'mmH2O', 'kPa')).toBeCloseTo(9.80665, 5);
  });

  it('satuan sama → nilai sama', () => {
    expect(convertPressure(12.34, 'bar', 'bar')).toBeCloseTo(12.34, 10);
  });

  it('gauge → absolut menambah 1 atm; absolut → gauge mengurangi', () => {
    expect(convertPressure(0, 'bar', 'bar', { fromRef: 'gauge', toRef: 'absolute' })).toBeCloseTo(1.01325, 6);
    expect(convertPressure(1.01325, 'bar', 'bar', { fromRef: 'absolute', toRef: 'gauge' })).toBeCloseTo(0, 6);
    // 100 psig ≈ 114.696 psia
    expect(convertPressure(100, 'psi', 'psi', { fromRef: 'gauge', toRef: 'absolute' })).toBeCloseTo(114.696, 2);
  });

  it('bolak-balik konsisten', () => {
    const there = convertPressure(7.5, 'bar', 'inH2O');
    expect(convertPressure(there, 'inH2O', 'bar')).toBeCloseTo(7.5, 8);
  });

  it('satuan tidak dikenal → error', () => {
    expect(() => convertPressure(1, 'xx', 'bar')).toThrow();
  });
});

describe('convertFlow', () => {
  it('volumetrik', () => {
    expect(convertFlow(1, 'm3h', 'Lmin')).toBeCloseTo(16.6667, 4);
    expect(convertFlow(1, 'gpm', 'm3h')).toBeCloseTo(0.2271247, 6);
    expect(convertFlow(1, 'bbld', 'm3h')).toBeCloseTo(0.00662447, 8);
    expect(convertFlow(1, 'mmscfd', 'm3h')).toBeCloseTo(1179.8686, 3);
    expect(convertFlow(60, 'cfm', 'ft3h')).toBeCloseTo(3600, 6);
  });

  it('massa', () => {
    expect(convertFlow(1, 'th', 'kgh')).toBeCloseTo(1000, 8);
    expect(convertFlow(1000, 'lbh', 'kgh')).toBeCloseTo(453.59237, 5);
  });

  it('lintas jenis tanpa densitas → null; dengan densitas dihitung', () => {
    expect(convertFlow(10, 'th', 'm3h')).toBeNull();
    expect(convertFlow(10, 'th', 'm3h', 0)).toBeNull();
    expect(convertFlow(10, 'th', 'm3h', Number.NaN)).toBeNull();
    expect(convertFlow(10, 'th', 'm3h', 1000)).toBeCloseTo(10, 8); // air
    expect(convertFlow(10, 'th', 'm3h', 800)).toBeCloseTo(12.5, 8);
    expect(convertFlow(12.5, 'm3h', 'th', 800)).toBeCloseTo(10, 8);
  });

  it('needsDensity hanya untuk lintas jenis', () => {
    expect(needsDensity('th', 'm3h')).toBe(true);
    expect(needsDensity('m3h', 'Lmin')).toBe(false);
    expect(needsDensity('kgh', 'th')).toBe(false);
  });
});

describe('convertSignal', () => {
  it('4–20 mA ↔ 1–5 V ↔ 0–10 V ↔ 3–15 psi ↔ %', () => {
    expect(convertSignal(12, '4-20mA', '1-5V')).toBeCloseTo(3, 10);
    expect(convertSignal(12, '4-20mA', '0-10V')).toBeCloseTo(5, 10);
    expect(convertSignal(12, '4-20mA', '3-15psi')).toBeCloseTo(9, 10);
    expect(convertSignal(12, '4-20mA', '0-100pct')).toBeCloseTo(50, 10);
    expect(convertSignal(4, '4-20mA', '0-20mA')).toBeCloseTo(0, 10);
    expect(convertSignal(10, '0-20mA', '4-20mA')).toBeCloseTo(12, 10);
    expect(convertSignal(60, '20-100kPa', '0.2-1bar')).toBeCloseTo(0.6, 10);
  });

  it('nilai di luar range diekstrapolasi (mis. alarm NAMUR 3,8 mA)', () => {
    expect(convertSignal(3.8, '4-20mA', '0-100pct')).toBeCloseTo(-1.25, 10);
    expect(convertSignal(21, '4-20mA', '0-100pct')).toBeCloseTo(106.25, 10);
  });
});

describe('processToSignal / signalToProcess', () => {
  it('tekanan dalam range → 4–20 mA', () => {
    const r = processToSignal(5, 0, 10, '4-20mA')!;
    expect(r.fraction).toBeCloseTo(0.5, 10);
    expect(r.signal).toBeCloseTo(12, 10);
    expect(r.outOfRange).toBe(false);
  });

  it('range offset (LRV bukan 0) & range negatif/vakum', () => {
    expect(processToSignal(150, 100, 200, '4-20mA')!.signal).toBeCloseTo(12, 10);
    expect(processToSignal(0, -1, 1, '4-20mA')!.signal).toBeCloseTo(12, 10);
  });

  it('di luar range ditandai', () => {
    expect(processToSignal(11, 0, 10, '4-20mA')!.outOfRange).toBe(true);
    expect(processToSignal(-1, 0, 10, '4-20mA')!.outOfRange).toBe(true);
    expect(processToSignal(0, 0, 10, '4-20mA')!.outOfRange).toBe(false);
    expect(processToSignal(10, 0, 10, '4-20mA')!.outOfRange).toBe(false);
  });

  it('URV = LRV → null (tidak bisa dihitung)', () => {
    expect(processToSignal(5, 5, 5, '4-20mA')).toBeNull();
    expect(signalToProcess(12, '4-20mA', 5, 5)).toBeNull();
  });

  it('range reverse (LRV > URV) tetap benar', () => {
    expect(processToSignal(2, 10, 0, '4-20mA')!.signal).toBeCloseTo(16.8, 10);
  });

  it('signal → proses adalah kebalikan', () => {
    const r = signalToProcess(16, '4-20mA', 0, 25)!;
    expect(r.pv).toBeCloseTo(18.75, 10);
    const back = processToSignal(r.pv, 0, 25, '4-20mA')!;
    expect(back.signal).toBeCloseTo(16, 10);
  });

  it('sinyal selain mA', () => {
    expect(processToSignal(5, 0, 10, '0-10V')!.signal).toBeCloseTo(5, 10);
    expect(processToSignal(2.5, 0, 10, '3-15psi')!.signal).toBeCloseTo(6, 10);
  });
});

describe('parseNumber', () => {
  it('menerima koma dan titik', () => {
    expect(parseNumber('4,5')).toBe(4.5);
    expect(parseNumber('4.5')).toBe(4.5);
    expect(parseNumber('-0,25')).toBe(-0.25);
    expect(parseNumber(' 12 ')).toBe(12);
    expect(parseNumber('1e3')).toBe(1000);
    expect(parseNumber('.5')).toBe(0.5);
  });

  it('input kosong/tidak valid → null', () => {
    for (const bad of ['', ' ', '-', '.', 'abc', '1,2,3', '1.2.3', '12abc', 'Infinity']) {
      expect(parseNumber(bad)).toBeNull();
    }
  });
});

describe('formatNumber / formatPlain', () => {
  it('format id-ID, maks 7 digit signifikan', () => {
    expect(formatNumber(14.503773773)).toBe('14,50377');
    expect(formatNumber(1234.5)).toBe('1.234,5');
    expect(formatNumber(0)).toBe('0');
    expect(formatNumber(-12)).toBe('-12');
  });

  it('ekstrem → notasi ilmiah; tidak valid → strip', () => {
    expect(formatNumber(1.5e13)).toContain('e+13');
    expect(formatNumber(1e-8)).toContain('e-8');
    expect(formatNumber(null)).toBe('—');
    expect(formatNumber(Number.NaN)).toBe('—');
    expect(formatNumber(Infinity)).toBe('—');
  });

  it('formatPlain: titik desimal tanpa pemisah ribuan, buang noise floating point', () => {
    expect(formatPlain(1234.5)).toBe('1234.5');
    expect(formatPlain(0.1 + 0.2)).toBe('0.3');
    expect(formatPlain(Number.NaN)).toBe('');
  });
});
