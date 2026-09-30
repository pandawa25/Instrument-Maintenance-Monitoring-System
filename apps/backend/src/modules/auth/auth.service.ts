import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Role, User } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../prisma/prisma.service';
import { LoginDto } from './dto/login.dto';
import { generateRefreshToken, hashToken, parseDurationMs } from './utils/token.util';

export interface JwtPayload {
  sub: string;
  email: string;
  fullName: string;
  role: string;
}

export interface RequestMeta {
  userAgent?: string;
  ipAddress?: string;
}

type UserWithRole = User & { role: Role };

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
  ) {}

  private toAuthUser(user: UserWithRole) {
    return { id: user.id, email: user.email, fullName: user.fullName, role: user.role.name };
  }

  private issueAccessToken(user: UserWithRole): Promise<string> {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      fullName: user.fullName,
      role: user.role.name,
    };
    return this.jwtService.signAsync(payload);
  }

  /**
   * Buat 1 refresh token baru untuk user — token mentah HANYA dikembalikan di
   * sini untuk langsung dikirim ke client lewat cookie; yang disimpan ke DB
   * selalu hash-nya. Dipakai baik saat login maupun saat rotasi (refresh).
   */
  private async issueRefreshToken(userId: string, meta: RequestMeta) {
    const rawToken = generateRefreshToken();
    const tokenHash = hashToken(rawToken);
    const refreshExpiresIn = this.config.get<string>('jwt.refreshExpiresIn')!;
    const expiresAt = new Date(Date.now() + parseDurationMs(refreshExpiresIn));

    const created = await this.prisma.refreshToken.create({
      data: {
        userId,
        tokenHash,
        expiresAt,
        userAgent: meta.userAgent?.slice(0, 255),
        ipAddress: meta.ipAddress?.slice(0, 45),
      },
    });

    return { id: created.id, rawToken, expiresAt };
  }

  async login(dto: LoginDto, meta: RequestMeta) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
      include: { role: true },
    });

    if (!user) {
      // Email tidak terdaftar sama sekali — TIDAK dicatat ke login_history
      // (keputusan design review: hindari noise dari salah ketik/bot scan).
      throw new UnauthorizedException('Email atau password salah');
    }

    // bcrypt.compare selalu dijalankan (bukan di-skip untuk akun nonaktif)
    // supaya waktu respons tidak membocorkan status akun lewat timing.
    const hashMatches = await bcrypt.compare(dto.password, user.passwordHash);
    const success = hashMatches && !user.deletedAt && user.isActive;

    await this.prisma.loginHistory.create({
      data: {
        userId: user.id,
        success,
        userAgent: meta.userAgent?.slice(0, 255),
        ipAddress: meta.ipAddress?.slice(0, 45),
      },
    });

    if (!success) {
      throw new UnauthorizedException('Email atau password salah');
    }

    await this.prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });

    const accessToken = await this.issueAccessToken(user);
    const { rawToken: refreshToken, expiresAt: refreshTokenExpiresAt } = await this.issueRefreshToken(
      user.id,
      meta,
    );

    return { accessToken, refreshToken, refreshTokenExpiresAt, user: this.toAuthUser(user) };
  }

  /**
   * Tukar refresh token lama dengan yang baru (rotation, one-time use).
   * Kalau token yang dikirim ternyata SUDAH di-revoke sebelumnya, itu tanda
   * token dicuri & dipakai ulang (replay) — semua refresh token user ini
   * langsung dicabut sekaligus, memaksa login ulang dari semua device.
   */
  async refresh(rawToken: string | undefined, meta: RequestMeta) {
    if (!rawToken) {
      throw new UnauthorizedException('Sesi tidak ditemukan, silakan login ulang');
    }

    const tokenHash = hashToken(rawToken);
    const existing = await this.prisma.refreshToken.findUnique({
      where: { tokenHash },
      include: { user: { include: { role: true } } },
    });

    if (!existing) {
      throw new UnauthorizedException('Sesi tidak valid, silakan login ulang');
    }

    if (existing.revokedAt) {
      await this.prisma.refreshToken.updateMany({
        where: { userId: existing.userId, revokedAt: null },
        data: { revokedAt: new Date() },
      });
      throw new UnauthorizedException('Sesi terdeteksi tidak wajar — semua sesi dicabut, silakan login ulang');
    }

    if (existing.expiresAt.getTime() < Date.now()) {
      throw new UnauthorizedException('Sesi sudah kadaluarsa, silakan login ulang');
    }

    const user = existing.user;
    if (!user || user.deletedAt || !user.isActive) {
      throw new UnauthorizedException('Akun tidak aktif');
    }

    const { id: newTokenId, rawToken: newRefreshToken, expiresAt: refreshTokenExpiresAt } =
      await this.issueRefreshToken(user.id, meta);

    await this.prisma.refreshToken.update({
      where: { id: existing.id },
      data: { revokedAt: new Date(), replacedById: newTokenId },
    });

    const accessToken = await this.issueAccessToken(user);

    return { accessToken, refreshToken: newRefreshToken, refreshTokenExpiresAt, user: this.toAuthUser(user) };
  }

  /** Logout — cabut HANYA refresh token yang sedang dipakai (bukan semua sesi device lain). */
  async logout(rawToken: string | undefined) {
    if (!rawToken) return;
    const tokenHash = hashToken(rawToken);
    await this.prisma.refreshToken.updateMany({
      where: { tokenHash, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }
}
