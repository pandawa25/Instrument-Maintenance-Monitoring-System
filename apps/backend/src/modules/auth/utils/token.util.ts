import { createHash, randomBytes } from 'crypto';

// Refresh token OPAQUE (bukan JWT) — 64 byte random, di-encode hex (128 char).
// Entropy jauh lebih dari cukup, tidak butuh algoritma hash lambat seperti
// bcrypt (itu untuk password yang low-entropy/user-chosen) — SHA-256 cukup
// dan jauh lebih cepat untuk lookup di setiap request /auth/refresh.
export function generateRefreshToken(): string {
  return randomBytes(64).toString('hex');
}

export function hashToken(rawToken: string): string {
  return createHash('sha256').update(rawToken).digest('hex');
}

const DURATION_UNIT_MS: Record<string, number> = {
  ms: 1,
  s: 1000,
  m: 60_000,
  h: 3_600_000,
  d: 86_400_000,
};

// Parser durasi kecil ('7d', '15m', '8h', '30s') — dipakai untuk hitung
// expiresAt refresh token dari config JWT_REFRESH_EXPIRES_IN.
export function parseDurationMs(value: string): number {
  const match = /^(\d+)\s*(ms|s|m|h|d)?$/i.exec(value.trim());
  if (!match) {
    throw new Error(`Format durasi tidak valid: '${value}' (contoh yang benar: '7d', '15m', '8h')`);
  }
  const amount = Number(match[1]);
  const unit = (match[2] ?? 'ms').toLowerCase();
  return amount * DURATION_UNIT_MS[unit];
}
