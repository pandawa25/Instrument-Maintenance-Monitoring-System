import { UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service';
import { hashToken } from './utils/token.util';

jest.mock('bcrypt');
const bcryptCompareMock = bcrypt.compare as unknown as jest.Mock;

function buildPrismaMock() {
  return {
    user: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    loginHistory: {
      create: jest.fn(),
    },
    refreshToken: {
      create: jest.fn(),
      findUnique: jest.fn(),
      updateMany: jest.fn(),
      update: jest.fn(),
    },
  };
}

function buildJwtServiceMock() {
  return { signAsync: jest.fn().mockResolvedValue('signed-access-token') };
}

function buildConfigMock() {
  return { get: jest.fn().mockReturnValue('7d') };
}

const activeUser = {
  id: 'user-1',
  email: 'teknisi@imms.local',
  fullName: 'Teknisi Satu',
  passwordHash: 'hashed-password',
  isActive: true,
  deletedAt: null,
  role: { id: 'role-1', name: 'Admin' },
};

const meta = { userAgent: 'jest-agent', ipAddress: '127.0.0.1' };

describe('AuthService.login', () => {
  let prisma: ReturnType<typeof buildPrismaMock>;
  let service: AuthService;

  beforeEach(() => {
    prisma = buildPrismaMock();
    service = new AuthService(prisma as any, buildJwtServiceMock() as any, buildConfigMock() as any);
    jest.clearAllMocks();
  });

  it('menolak login untuk email yang tidak terdaftar TANPA mencatat login_history (hindari noise enumerasi)', async () => {
    prisma.user.findUnique.mockResolvedValue(null);

    await expect(service.login({ email: 'tidak-ada@imms.local', password: 'x' }, meta)).rejects.toThrow(
      UnauthorizedException,
    );

    expect(prisma.loginHistory.create).not.toHaveBeenCalled();
  });

  it('tetap menjalankan bcrypt.compare untuk akun nonaktif (timing-safe, tidak di-short-circuit)', async () => {
    const inactiveUser = { ...activeUser, isActive: false };
    prisma.user.findUnique.mockResolvedValue(inactiveUser);
    bcryptCompareMock.mockResolvedValue(true);

    await expect(service.login({ email: inactiveUser.email, password: 'benar' }, meta)).rejects.toThrow(
      UnauthorizedException,
    );

    expect(bcryptCompareMock).toHaveBeenCalledWith('benar', inactiveUser.passwordHash);
    expect(prisma.loginHistory.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ success: false }) }),
    );
  });

  it('mencatat login_history sukses=false untuk password salah pada akun terdaftar', async () => {
    prisma.user.findUnique.mockResolvedValue(activeUser);
    bcryptCompareMock.mockResolvedValue(false);

    await expect(service.login({ email: activeUser.email, password: 'salah' }, meta)).rejects.toThrow(
      UnauthorizedException,
    );

    expect(prisma.loginHistory.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ userId: activeUser.id, success: false }) }),
    );
  });

  it('login sukses: mengembalikan access+refresh token dan mencatat login_history sukses=true', async () => {
    prisma.user.findUnique.mockResolvedValue(activeUser);
    bcryptCompareMock.mockResolvedValue(true);
    prisma.refreshToken.create.mockResolvedValue({ id: 'rt-1' });

    const result = await service.login({ email: activeUser.email, password: 'benar' }, meta);

    expect(result.accessToken).toBe('signed-access-token');
    expect(typeof result.refreshToken).toBe('string');
    expect(result.refreshToken.length).toBeGreaterThan(0);
    expect(result.user).toEqual({
      id: activeUser.id,
      email: activeUser.email,
      fullName: activeUser.fullName,
      role: 'Admin',
    });

    expect(prisma.loginHistory.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ success: true }) }),
    );
    expect(prisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: activeUser.id } }),
    );

    // Refresh token mentah tidak boleh pernah disimpan langsung ke DB — hanya hash-nya.
    const createCallArgs = prisma.refreshToken.create.mock.calls[0][0];
    expect(createCallArgs.data.tokenHash).toBe(hashToken(result.refreshToken));
  });
});

describe('AuthService.refresh', () => {
  let prisma: ReturnType<typeof buildPrismaMock>;
  let service: AuthService;

  beforeEach(() => {
    prisma = buildPrismaMock();
    service = new AuthService(prisma as any, buildJwtServiceMock() as any, buildConfigMock() as any);
  });

  it('menolak kalau tidak ada raw token sama sekali', async () => {
    await expect(service.refresh(undefined, meta)).rejects.toThrow(UnauthorizedException);
  });

  it('menolak kalau token tidak ditemukan di database', async () => {
    prisma.refreshToken.findUnique.mockResolvedValue(null);

    await expect(service.refresh('token-asing', meta)).rejects.toThrow(UnauthorizedException);
  });

  it('reuse detection: token yang SUDAH revoked dipakai lagi -> cabut SEMUA refresh token user itu', async () => {
    prisma.refreshToken.findUnique.mockResolvedValue({
      id: 'rt-1',
      userId: activeUser.id,
      revokedAt: new Date(),
      expiresAt: new Date(Date.now() + 100_000),
      user: activeUser,
    });

    await expect(service.refresh('token-lama-dicuri', meta)).rejects.toThrow(UnauthorizedException);

    expect(prisma.refreshToken.updateMany).toHaveBeenCalledWith({
      where: { userId: activeUser.id, revokedAt: null },
      data: { revokedAt: expect.any(Date) },
    });
  });

  it('menolak kalau token sudah kedaluwarsa', async () => {
    prisma.refreshToken.findUnique.mockResolvedValue({
      id: 'rt-1',
      userId: activeUser.id,
      revokedAt: null,
      expiresAt: new Date(Date.now() - 1000),
      user: activeUser,
    });

    await expect(service.refresh('token-expired', meta)).rejects.toThrow(UnauthorizedException);
  });

  it('rotation: token valid -> token baru diterbitkan, token lama di-revoke + ditautkan lewat replacedById', async () => {
    prisma.refreshToken.findUnique.mockResolvedValue({
      id: 'rt-old',
      userId: activeUser.id,
      revokedAt: null,
      expiresAt: new Date(Date.now() + 100_000),
      user: activeUser,
    });
    prisma.refreshToken.create.mockResolvedValue({ id: 'rt-new' });

    const result = await service.refresh('token-valid', meta);

    expect(result.accessToken).toBe('signed-access-token');
    expect(prisma.refreshToken.update).toHaveBeenCalledWith({
      where: { id: 'rt-old' },
      data: { revokedAt: expect.any(Date), replacedById: 'rt-new' },
    });
  });
});

describe('AuthService.logout', () => {
  it('mencabut hanya refresh token yang sedang dipakai (bukan semua sesi)', async () => {
    const prisma = buildPrismaMock();
    const service = new AuthService(prisma as any, buildJwtServiceMock() as any, buildConfigMock() as any);

    const rawToken = 'token-aktif';
    await service.logout(rawToken);

    expect(prisma.refreshToken.updateMany).toHaveBeenCalledWith({
      where: { tokenHash: hashToken(rawToken), revokedAt: null },
      data: { revokedAt: expect.any(Date) },
    });
  });

  it('tidak melakukan apa-apa kalau tidak ada token (mis. sudah logout sebelumnya)', async () => {
    const prisma = buildPrismaMock();
    const service = new AuthService(prisma as any, buildJwtServiceMock() as any, buildConfigMock() as any);

    await service.logout(undefined);

    expect(prisma.refreshToken.updateMany).not.toHaveBeenCalled();
  });
});
