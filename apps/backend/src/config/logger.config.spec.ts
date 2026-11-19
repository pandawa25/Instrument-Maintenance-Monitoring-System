import { buildPinoHttpOptions } from './logger.config';

describe('buildPinoHttpOptions', () => {
  it('production: level default info, tanpa transport pretty (JSON polos untuk log aggregator)', () => {
    const options = buildPinoHttpOptions('production');
    expect(options?.level).toBe('info');
    expect(options?.transport).toBeUndefined();
  });

  it('development: level default debug, pakai transport pino-pretty', () => {
    const options = buildPinoHttpOptions('development');
    expect(options?.level).toBe('debug');
    expect(options?.transport).toMatchObject({ target: 'pino-pretty' });
  });

  it('LOG_LEVEL env override menang atas default per-environment', () => {
    const original = process.env.LOG_LEVEL;
    process.env.LOG_LEVEL = 'warn';
    try {
      const options = buildPinoHttpOptions('production');
      expect(options?.level).toBe('warn');
    } finally {
      if (original === undefined) delete process.env.LOG_LEVEL;
      else process.env.LOG_LEVEL = original;
    }
  });

  it('redact header authorization, cookie, dan set-cookie', () => {
    const options = buildPinoHttpOptions('production');
    const redact = options?.redact as { paths: string[]; censor: string };
    expect(redact.paths).toEqual([
      'req.headers.authorization',
      'req.headers.cookie',
      'res.headers["set-cookie"]',
    ]);
    expect(redact.censor).toBe('[REDACTED]');
  });

  it('genReqId memakai header x-request-id dari proxy kalau ada', () => {
    const options = buildPinoHttpOptions('production');
    const genReqId = options?.genReqId as (req: unknown) => string;
    const req = { headers: { 'x-request-id': 'abc-123' } };
    expect(genReqId(req)).toBe('abc-123');
  });

  it('genReqId fallback ke UUID baru kalau header x-request-id kosong/tidak ada', () => {
    const options = buildPinoHttpOptions('production');
    const genReqId = options?.genReqId as (req: unknown) => string;
    const idWithoutHeader = genReqId({ headers: {} });
    const idWithBlankHeader = genReqId({ headers: { 'x-request-id': '   ' } });
    // UUID v4 format — bukan nilai header yang kosong/tidak valid.
    expect(idWithoutHeader).toMatch(/^[0-9a-f-]{36}$/);
    expect(idWithBlankHeader).toMatch(/^[0-9a-f-]{36}$/);
  });

  it('customLogLevel: >=500 atau ada error -> error, >=400 -> warn, selain itu -> info', () => {
    const options = buildPinoHttpOptions('production');
    const customLogLevel = options?.customLogLevel as (
      req: unknown,
      res: { statusCode: number },
      err?: Error,
    ) => string;
    expect(customLogLevel({}, { statusCode: 200 })).toBe('info');
    expect(customLogLevel({}, { statusCode: 404 })).toBe('warn');
    expect(customLogLevel({}, { statusCode: 500 })).toBe('error');
    expect(customLogLevel({}, { statusCode: 200 }, new Error('boom'))).toBe('error');
  });

  it('autoLogging.ignore bernilai true hanya untuk /api/health', () => {
    const options = buildPinoHttpOptions('production');
    const autoLogging = options?.autoLogging as { ignore: (req: { url: string }) => boolean };
    expect(autoLogging.ignore({ url: '/api/health' })).toBe(true);
    expect(autoLogging.ignore({ url: '/api/areas' })).toBe(false);
  });
});
