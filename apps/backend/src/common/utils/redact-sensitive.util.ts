// Nama field (case-insensitive, cocok sebagian/substring) yang TIDAK BOLEH
// pernah tersimpan apa adanya ke audit_logs — mis. CreateUserDto.password,
// ChangePasswordDto.newPassword. Dicek sebagai substring supaya varian
// seperti `oldPassword`/`currentPassword`/`passwordHash` ikut tertangkap.
const SENSITIVE_KEY_PATTERNS = ['password', 'token', 'secret', 'refreshtoken'];

function isSensitiveKey(key: string): boolean {
  const lower = key.toLowerCase();
  return SENSITIVE_KEY_PATTERNS.some((pattern) => lower.includes(pattern));
}

/**
 * Redaksi rekursif — dipakai AuditLogInterceptor sebelum menyimpan snapshot
 * request body ke kolom `payload` (JSON) tabel audit_logs. Field yang
 * namanya cocok salah satu pola sensitif diganti '[REDACTED]', field lain
 * dibiarkan apa adanya. Aman dipanggil dengan `undefined`/`null`/primitif.
 */
export function redactSensitive<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map((item) => redactSensitive(item)) as unknown as T;
  }

  if (value && typeof value === 'object') {
    const result: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
      result[key] = isSensitiveKey(key) ? '[REDACTED]' : redactSensitive(val);
    }
    return result as T;
  }

  return value;
}
