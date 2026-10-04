import { Body, Controller, HttpCode, HttpStatus, Post, Req, Res, UseGuards } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Throttle } from '@nestjs/throttler';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import type { CookieOptions, Request, Response } from 'express';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser, AuthenticatedUser } from '../../common/decorators/current-user.decorator';
import { PermissionsService } from '../permissions/permissions.service';

const REFRESH_COOKIE_NAME = 'imms_refresh_token';
// Discope cookie ke prefix /api/auth saja — browser hanya kirim cookie ini
// untuk request ke /api/auth/*, tidak ikut "nebeng" di setiap request API lain.
const REFRESH_COOKIE_PATH = '/api/auth';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly config: ConfigService,
    private readonly permissionsService: PermissionsService,
  ) {}

  private cookieOptions(expires?: Date): CookieOptions {
    const secure = this.config.get<boolean>('cookieSecure') ?? false;
    return {
      httpOnly: true,
      secure,
      // SameSite=None WAJIB Secure (ditolak browser kalau tidak) — dipakai di
      // production (Railway, HTTPS) karena frontend & backend beda subdomain.
      // Lokal (docker-compose, HTTP polos) pakai Lax, cukup karena sama "site".
      sameSite: secure ? 'none' : 'lax',
      path: REFRESH_COOKIE_PATH,
      expires,
    };
  }

  private requestMeta(req: Request) {
    const forwardedFor = req.headers['x-forwarded-for'];
    const ipAddress = typeof forwardedFor === 'string' ? forwardedFor.split(',')[0]?.trim() : req.ip;
    return {
      userAgent: req.headers['user-agent'],
      ipAddress,
    };
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  // Limit jauh lebih ketat dari default global (lihat app.module.ts) — endpoint
  // ini target utama brute-force password. 5 percobaan/menit/IP cukup longgar
  // untuk user asli yang salah ketik, tapi bikin brute-force tidak praktis.
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @ApiOperation({ summary: 'Login — dapat access token (response body) + refresh token (httpOnly cookie)' })
  async login(@Body() dto: LoginDto, @Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const result = await this.authService.login(dto, this.requestMeta(req));
    res.cookie(REFRESH_COOKIE_NAME, result.refreshToken, this.cookieOptions(result.refreshTokenExpiresAt));
    return { accessToken: result.accessToken, user: result.user };
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  // Lebih longgar dari login (dipanggil otomatis oleh interceptor axios tiap
  // access token kedaluwarsa/15 menit), tapi tetap dibatasi untuk cegah abuse
  // percobaan tebak refresh token.
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @ApiOperation({ summary: 'Tukar refresh token (cookie) dengan access token baru — refresh token ikut dirotasi' })
  async refresh(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const rawToken = req.cookies?.[REFRESH_COOKIE_NAME] as string | undefined;
    const result = await this.authService.refresh(rawToken, this.requestMeta(req));
    res.cookie(REFRESH_COOKIE_NAME, result.refreshToken, this.cookieOptions(result.refreshTokenExpiresAt));
    return { accessToken: result.accessToken, user: result.user };
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Logout — cabut refresh token yang sedang dipakai di device ini' })
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const rawToken = req.cookies?.[REFRESH_COOKIE_NAME] as string | undefined;
    await this.authService.logout(rawToken);
    res.clearCookie(REFRESH_COOKIE_NAME, { path: REFRESH_COOKIE_PATH });
    return { success: true };
  }

  @Post('me')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'Cek identitas dari token yang sedang dipakai, termasuk map permission per modul (untuk sidebar/tombol aksi di frontend)',
  })
  async me(@CurrentUser() user: AuthenticatedUser) {
    const permissions = await this.permissionsService.getMyPermissions(user);
    return { ...user, permissions };
  }
}
