import { Controller, Get, HttpCode, HttpStatus, ServiceUnavailableException } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';
import { PrismaService } from '../../prisma/prisma.service';

/**
 * Endpoint health untuk Railway (lihat HEALTHCHECK di docker/Dockerfile.backend) —
 * Technical Debt Risk #9: sebelumnya Railway hanya tahu container "crash" (proses
 * mati total), tidak bisa deteksi "hidup tapi stuck" (mis. connection pool ke
 * Postgres habis/deadlock) karena proses Node-nya sendiri tetap berjalan normal.
 *
 * Query `SELECT 1` dipakai (bukan cuma `$connect()` yang sudah dipanggil sekali
 * di PrismaService.onModuleInit) supaya setiap health check benar-benar menguji
 * pool koneksi saat itu juga, bukan cuma status koneksi awal saat boot.
 *
 * @SkipThrottle() — dipanggil otomatis & cepat oleh Railway tiap beberapa detik,
 * tidak boleh ikut kena rate limit global 100 req/menit/IP.
 */
@ApiTags('health')
@SkipThrottle()
@Controller('health')
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  async check() {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return {
        status: 'ok' as const,
        database: 'up' as const,
        timestamp: new Date().toISOString(),
      };
    } catch {
      // 503 (bukan 500) — ini kegagalan dependency (DB), bukan bug di handler
      // health check itu sendiri. Railway/load balancer membaca 5xx sebagai
      // "unhealthy" untuk kedua kode, tapi 503 lebih akurat untuk monitoring lain.
      throw new ServiceUnavailableException({
        status: 'error',
        database: 'down',
        timestamp: new Date().toISOString(),
      });
    }
  }
}
