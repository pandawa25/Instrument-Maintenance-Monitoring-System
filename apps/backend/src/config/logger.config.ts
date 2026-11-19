import { randomUUID } from 'crypto';
import type { Params } from 'nestjs-pino';
import type { IncomingMessage, ServerResponse } from 'http';

// Path yang dikecualikan dari auto-log per-request — Railway healthcheck
// (docker/Dockerfile.backend) hit endpoint ini tiap 30 detik, kalau ikut
// dilog akan membanjiri log aggregator tanpa informasi baru (lihat Risk #10
// di docs/roadmap.md).
const HEALTH_CHECK_PATH = '/api/health';

/**
 * Konfigurasi pino-http untuk nestjs-pino (LoggerModule.forRootAsync).
 * Dipisah dari app.module.ts supaya mudah di-test/dibaca terpisah dari
 * wiring DI, mengikuti pola config/*.ts lain (app.config.ts, cors.util.ts).
 *
 * Desain:
 * - Production: JSON polos (tanpa transport) — format yang bisa langsung
 *   di-query/filter oleh log aggregator (Railway log search, dsb).
 * - Development/test: pino-pretty — warna + satu baris per log, supaya
 *   tetap nyaman dibaca di terminal lokal.
 * - req.headers.authorization/cookie & res "set-cookie" diredaksi — body
 *   request TIDAK pernah masuk log ini sama sekali (pino-http default
 *   serializer tidak menyertakan body), jadi redaksi body seperti di
 *   redact-sensitive.util.ts (dipakai AuditLogInterceptor) tidak relevan di
 *   sini.
 * - reqId: pakai header `x-request-id` dari proxy di depan (Railway edge/
 *   Cloudflare) kalau ada, supaya satu request bisa ditelusuri lintas layer;
 *   fallback randomUUID().
 * - Endpoint health check dikecualikan dari auto-log per-request (lihat
 *   HEALTH_CHECK_PATH).
 */
export function buildPinoHttpOptions(nodeEnv: string): Params['pinoHttp'] {
  const isProduction = nodeEnv === 'production';

  return {
    level: process.env.LOG_LEVEL ?? (isProduction ? 'info' : 'debug'),
    redact: {
      paths: ['req.headers.authorization', 'req.headers.cookie', 'res.headers["set-cookie"]'],
      censor: '[REDACTED]',
    },
    genReqId: (req: IncomingMessage) => {
      const fromProxy = req.headers['x-request-id'];
      if (typeof fromProxy === 'string' && fromProxy.trim() !== '') {
        return fromProxy;
      }
      return randomUUID();
    },
    customProps: (req: IncomingMessage) => ({
      reqId: (req as IncomingMessage & { id?: string }).id,
    }),
    customLogLevel: (_req: IncomingMessage, res: ServerResponse, err?: Error) => {
      if (err || res.statusCode >= 500) return 'error';
      if (res.statusCode >= 400) return 'warn';
      return 'info';
    },
    autoLogging: {
      ignore: (req: IncomingMessage) => req.url === HEALTH_CHECK_PATH,
    },
    transport: isProduction
      ? undefined
      : {
          target: 'pino-pretty',
          options: {
            colorize: true,
            singleLine: true,
            translateTime: 'SYS:standard',
            ignore: 'pid,hostname',
          },
        },
  };
}
