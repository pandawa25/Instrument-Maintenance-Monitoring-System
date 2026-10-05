/** Tanggal hari ini (yyyy-mm-dd) menurut zona waktu browser — nilai default & batas atas input tanggal transaksi. */
export function todayDateInput(): string {
  // Locale 'en-CA' memformat tanggal sebagai yyyy-mm-dd.
  return new Date().toLocaleDateString('en-CA');
}

/** 'yyyy-mm-dd' dari API -> tampilan lokal (id-ID) tanpa pergeseran zona waktu. */
export function formatMovementDate(value: string): string {
  return new Date(`${value.slice(0, 10)}T00:00:00`).toLocaleDateString('id-ID');
}
