// Helper murni (tanpa dependency framework) yang dipakai backend & frontend.
// Contoh: format tanggal konsisten, formatting downtime hours, dsb.
// Diisi mulai Module Instrument saat kebutuhan format bersama muncul.

export function formatDateID(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
}

/**
 * Bentuk kanonik tag_number: trim, rapikan spasi ganda jadi satu spasi, uppercase.
 *
 * WAJIB dipakai di setiap jalur yang menulis atau membandingkan Equipment.tagNumber
 * (create/update manual di EquipmentService, dan nanti modul bulk import) — supaya
 * "PT-101", " pt-101 ", dan "pt   101" semua dianggap tag yang sama secara konsisten
 * di level aplikasi, sejalan dengan constraint DB `equipment_tag_number_active_key`
 * (partial unique index case-insensitive via UPPER(tag_number), lihat migration
 * 20260928000100_equipment_tag_partial_unique).
 */
export function normalizeTag(rawTag: string): string {
  return rawTag.trim().replace(/\s+/g, ' ').toUpperCase();
}
