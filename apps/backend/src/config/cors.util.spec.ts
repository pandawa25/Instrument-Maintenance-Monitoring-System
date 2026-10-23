import { parseCorsOrigins, toCorsOriginOption } from './cors.util';

describe('parseCorsOrigins', () => {
  it('memakai fallback kalau env kosong', () => {
    expect(parseCorsOrigins(undefined)).toEqual(['http://localhost:5173']);
    expect(parseCorsOrigins('   ')).toEqual(['http://localhost:5173']);
  });

  it('membuang trailing slash dan path', () => {
    expect(parseCorsOrigins('https://tigalimabelas.com/')).toEqual(['https://tigalimabelas.com']);
    expect(parseCorsOrigins('https://tigalimabelas.com/login')).toEqual(['https://tigalimabelas.com']);
  });

  it('melowercase host', () => {
    expect(parseCorsOrigins('https://TigaLimaBelas.com')).toEqual(['https://tigalimabelas.com']);
  });

  it('mendukung beberapa origin dipisah koma (apex + www), tanpa duplikat', () => {
    expect(
      parseCorsOrigins('https://tigalimabelas.com, https://www.tigalimabelas.com/ ,https://tigalimabelas.com'),
    ).toEqual(['https://tigalimabelas.com', 'https://www.tigalimabelas.com']);
  });

  it('mempertahankan port non-default', () => {
    expect(parseCorsOrigins('http://localhost:5173/')).toEqual(['http://localhost:5173']);
  });

  it('nilai tanpa scheme tetap dibersihkan (best effort)', () => {
    expect(parseCorsOrigins('TigaLimaBelas.com/')).toEqual(['tigalimabelas.com']);
  });
});

describe('toCorsOriginOption — wildcard subdomain', () => {
  const allowed = (origins: string[], candidate: string) =>
    toCorsOriginOption(parseCorsOrigins(origins.join(','))).some((o) => (typeof o === 'string' ? o === candidate : o.test(candidate)));

  it('origin biasa dipertahankan apa adanya (cocok persis)', () => {
    expect(allowed(['https://tigalimabelas.com'], 'https://tigalimabelas.com')).toBe(true);
    expect(allowed(['https://tigalimabelas.com'], 'https://app.tigalimabelas.com')).toBe(false);
  });

  it('https://*.domain cocok dengan semua subdomain, termasuk bertingkat', () => {
    const list = ['https://*.tigalimabelas.com'];
    expect(allowed(list, 'https://app.tigalimabelas.com')).toBe(true);
    expect(allowed(list, 'https://staging.app.tigalimabelas.com')).toBe(true);
  });

  it('wildcard TIDAK mencakup apex, scheme lain, atau domain yang hanya mirip', () => {
    const list = ['https://*.tigalimabelas.com'];
    expect(allowed(list, 'https://tigalimabelas.com')).toBe(false);
    expect(allowed(list, 'http://app.tigalimabelas.com')).toBe(false);
    expect(allowed(list, 'https://app.tigalimabelas.com.evil.com')).toBe(false);
    expect(allowed(list, 'https://evil-tigalimabelas.com')).toBe(false);
    expect(allowed(list, 'https://tigalimabelas.com.evil.com')).toBe(false);
  });

  it('bisa digabung dengan apex dan origin lain', () => {
    const list = ['https://tigalimabelas.com', 'https://*.tigalimabelas.com', 'https://imms.up.railway.app'];
    expect(allowed(list, 'https://tigalimabelas.com')).toBe(true);
    expect(allowed(list, 'https://app.tigalimabelas.com')).toBe(true);
    expect(allowed(list, 'https://imms.up.railway.app')).toBe(true);
  });
});
