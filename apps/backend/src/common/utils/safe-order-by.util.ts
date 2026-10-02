/**
 * Validasi `sortBy` dari query param terhadap whitelist kolom yang memang
 * dimaksudkan untuk bisa di-sort di endpoint tsb, sebelum dipakai sebagai
 * Prisma `orderBy` key.
 *
 * Tanpa ini, `sortBy` (cuma di-validasi `@IsString()` di PaginationQueryDto)
 * bisa diisi client dengan nama kolom APAPUN — termasuk kolom yang tidak ada
 * di model, yang menyebabkan Prisma melempar `PrismaClientValidationError`.
 * Error itu bukan `PrismaClientKnownRequestError`, jadi sebelum perbaikan ini
 * GlobalExceptionFilter mengembalikan `exception.message` mentah (berisi
 * nama tabel/kolom/detail skema) langsung ke response API.
 *
 * Fallback DIAM-DIAM ke kolom default kalau sortBy tidak dikenal — bukan
 * throw error — supaya tidak ada perubahan perilaku untuk request lama yang
 * kebetulan salah ketik, cuma menutup celah untuk input yang disengaja.
 */
export function buildSafeOrderBy<T extends string>(
  sortBy: string | undefined,
  sortOrder: 'asc' | 'desc',
  allowedFields: readonly T[],
  fallbackField: T,
): Record<string, 'asc' | 'desc'> {
  const field = sortBy && (allowedFields as readonly string[]).includes(sortBy) ? sortBy : fallbackField;
  return { [field]: sortOrder };
}
