// Helper murni (tanpa dependency framework) yang dipakai backend & frontend.
// Contoh: format tanggal konsisten, formatting downtime hours, dsb.
// Diisi mulai Module Instrument saat kebutuhan format bersama muncul.

export function formatDateID(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
}
