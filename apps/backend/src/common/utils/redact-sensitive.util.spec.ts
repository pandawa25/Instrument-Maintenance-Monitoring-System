import { redactSensitive } from './redact-sensitive.util';

describe('redactSensitive', () => {
  it('me-redact field password (case-insensitive) tapi membiarkan field lain', () => {
    const result = redactSensitive({ fullName: 'Budi', password: 'rahasia123', Email: 'budi@imms.local' });

    expect(result).toEqual({ fullName: 'Budi', password: '[REDACTED]', Email: 'budi@imms.local' });
  });

  it('me-redact varian nama field sensitif (newPassword, oldPassword, token, secret)', () => {
    const result = redactSensitive({
      newPassword: 'x',
      oldPassword: 'y',
      refreshToken: 'z',
      apiSecret: 'w',
      note: 'aman',
    });

    expect(result).toEqual({
      newPassword: '[REDACTED]',
      oldPassword: '[REDACTED]',
      refreshToken: '[REDACTED]',
      apiSecret: '[REDACTED]',
      note: 'aman',
    });
  });

  it('bekerja rekursif untuk object bersarang', () => {
    const result = redactSensitive({ user: { email: 'a@b.com', password: 'rahasia' } });

    expect(result).toEqual({ user: { email: 'a@b.com', password: '[REDACTED]' } });
  });

  it('bekerja untuk array of object', () => {
    const result = redactSensitive([{ password: 'a' }, { password: 'b' }]);

    expect(result).toEqual([{ password: '[REDACTED]' }, { password: '[REDACTED]' }]);
  });

  it('aman dipanggil dengan undefined, null, atau primitif', () => {
    expect(redactSensitive(undefined)).toBeUndefined();
    expect(redactSensitive(null)).toBeNull();
    expect(redactSensitive('teks biasa')).toBe('teks biasa');
    expect(redactSensitive(42)).toBe(42);
  });
});
