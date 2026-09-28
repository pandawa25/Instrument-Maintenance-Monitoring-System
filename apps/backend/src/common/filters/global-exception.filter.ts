import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { Prisma } from '@prisma/client';

/**
 * Menangkap SEMUA exception (HttpException, Prisma error, unknown error)
 * dan mengubahnya menjadi satu bentuk response error yang konsisten
 * di seluruh endpoint — sesuai standar API design di design doc.
 */
@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';
    let errors: string[] | undefined;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const body = exception.getResponse();
      if (typeof body === 'string') {
        message = body;
      } else if (typeof body === 'object' && body !== null) {
        const b = body as { message?: string | string[]; error?: string };
        if (Array.isArray(b.message)) {
          message = 'Validation failed';
          errors = b.message;
        } else {
          message = b.message ?? b.error ?? message;
        }
      }
    } else if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      status = this.mapPrismaStatus(exception.code);
      message = this.mapPrismaMessage(exception);
    } else if (exception instanceof Error) {
      message = exception.message;
      this.logger.error(exception.message, exception.stack);
    }

    response.status(status).json({
      statusCode: status,
      message,
      ...(errors ? { errors } : {}),
      path: request.url,
      timestamp: new Date().toISOString(),
    });
  }

  private mapPrismaStatus(code: string): number {
    switch (code) {
      case 'P2002': // unique constraint
        return HttpStatus.CONFLICT;
      case 'P2025': // record not found
        return HttpStatus.NOT_FOUND;
      case 'P2003': // FK constraint
        return HttpStatus.BAD_REQUEST;
      default:
        return HttpStatus.INTERNAL_SERVER_ERROR;
    }
  }

  private mapPrismaMessage(exception: Prisma.PrismaClientKnownRequestError): string {
    switch (exception.code) {
      case 'P2002': {
        const target = exception.meta?.target;
        // `equipment_tag_number_active_key` adalah partial unique index yang dibuat manual
        // lewat migration SQL (bukan @@unique di schema.prisma) — lihat catatan di
        // equipment.repository.ts. Karena tidak dikenal Prisma DMMF, `target` untuk index ini
        // biasanya berupa nama index/constraint mentah, bukan nama field — di-special-case di
        // sini supaya pesannya tetap jelas kalau race condition membuat pre-check di
        // EquipmentService.create/update kebobolan (dua request bersamaan lolos pre-check,
        // baru gagal di constraint DB).
        const targetStr = Array.isArray(target) ? target.join(', ') : String(target ?? '');
        if (targetStr.includes('equipment_tag_number_active_key')) {
          return 'Tag number sudah digunakan oleh equipment aktif lain';
        }
        return `Nilai untuk field ${targetStr || 'unik'} sudah digunakan`;
      }
      case 'P2025':
        return 'Data tidak ditemukan';
      case 'P2003':
        return 'Referensi data tidak valid (foreign key constraint)';
      default:
        return 'Database error';
    }
  }
}
