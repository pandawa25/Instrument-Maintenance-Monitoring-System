import { parseCorsOrigins } from './cors.util';

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
