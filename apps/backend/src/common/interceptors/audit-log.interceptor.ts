import { CallHandler, ExecutionContext, Injectable, Logger, NestInterceptor } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuditAction } from '@prisma/client';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import type { Request } from 'express';
import { PrismaService } from '../../prisma/prisma.service';
import { AUDIT_LOG_ENTITY_KEY } from '../decorators/audit-log.decorator';
import { AuthenticatedUser } from '../decorators/current-user.decorator';
import { redactSensitive } from '../utils/redact-sensitive.util';

const METHOD_TO_ACTION: Record<string, AuditAction> = {
  POST: 'CREATE',
  PUT: 'UPDATE',
  PATCH: 'UPDATE',
  DELETE: 'DELETE',
};

/**
 * Interceptor global (didaftarkan di main.ts) yang mencatat setiap mutasi ke
 * tabel audit_logs — TAPI hanya untuk endpoint yang eksplisit ditandai
 * @AuditLog('EntityName') (lihat decorators/audit-log.decorator.ts). Endpoint
 * tanpa metadata itu (termasuk semua GET, dan /auth/* yang punya login_history
 * sendiri) langsung lewat tanpa overhead tambahan.
 *
 * Kegagalan menulis audit log TIDAK BOLEH menggagalkan request aslinya —
 * di-catch & di-log lewat Logger saja, sesuai prinsip audit trail bersifat
 * best-effort/observability, bukan bagian dari alur bisnis inti.
 */
@Injectable()
export class AuditLogInterceptor implements NestInterceptor {
  private readonly logger = new Logger(AuditLogInterceptor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly reflector: Reflector,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() !== 'http') {
      return next.handle();
    }

    const entityType = this.reflector.get<string | undefined>(AUDIT_LOG_ENTITY_KEY, context.getHandler());
    if (!entityType) {
      return next.handle();
    }

    const request = context.switchToHttp().getRequest<Request>();
    const action = METHOD_TO_ACTION[request.method];
    if (!action) {
      return next.handle();
    }

    const user = (request as unknown as { user?: AuthenticatedUser }).user;
    // Semua endpoint yang dipasangi @AuditLog() berada di belakang JwtAuthGuard,
    // jadi user seharusnya selalu ada — dijaga tetap defensif untuk berjaga-jaga.
    if (!user) {
      return next.handle();
    }

    const forwardedFor = request.headers['x-forwarded-for'];
    const ipAddress = typeof forwardedFor === 'string' ? forwardedFor.split(',')[0]?.trim() : request.ip;
    const userAgent = request.headers['user-agent'];

    return next.handle().pipe(
      tap((result) => {
        const responseRecord = result as { data?: { id?: string }; id?: string } | undefined;
        const entityId = request.params?.id ?? request.params?.batchId ?? responseRecord?.data?.id ?? responseRecord?.id;

        const hasBody = request.body && Object.keys(request.body).length > 0;
        const payload = hasBody ? redactSensitive(request.body) : undefined;

        this.prisma.auditLog
          .create({
            data: {
              userId: user.id,
              action,
              entityType,
              entityId,
              payload,
              ipAddress: ipAddress?.slice(0, 45),
              userAgent: userAgent?.slice(0, 255),
            },
          })
          .catch((error) => {
            this.logger.error(`Gagal mencatat audit log (${action} ${entityType} ${entityId ?? '-'})`, error?.stack);
          });
      }),
    );
  }
}
