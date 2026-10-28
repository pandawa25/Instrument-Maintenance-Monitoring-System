import { describe, expect, it } from 'vitest';
import { hasValveData, isValveInstrumentName } from './equipment.types';

describe('isValveInstrumentName', () => {
  it.each([
    [{ code: 'CV', name: 'Control Valve' }],
    [{ code: 'kv', name: 'x' }],
    [{ code: 'PSV', name: 'Safety Valve' }],
    [{ code: 'XV', name: 'Apa saja' }],
    [{ code: 'xv', name: '' }],
    [{ code: 'XV', name: 'Ball valve' }],
    [{ code: 'BDV', name: 'Blowdown Valve (SIS)' }],
  ])('valve: %j', (ref) => expect(isValveInstrumentName(ref)).toBe(true));

  it.each([
    [{ code: 'PT', name: 'Pressure Transmitter' }],
    [{ code: 'VP', name: 'Valve Positioner' }],
    [{ code: 'FC', name: 'Flow Computer' }],
    [null],
    [undefined],
  ])('bukan valve: %j', (ref) => expect(isValveInstrumentName(ref as any)).toBe(false));
});

describe('hasValveData', () => {
  it('true bila salah satu size/rating/failAction terisi', () => {
    expect(hasValveData({ size: '2"' })).toBe(true);
    expect(hasValveData({ failAction: 'CLOSE' })).toBe(true);
    expect(hasValveData({ size: null, rating: '', failAction: null })).toBe(false);
  });
});
