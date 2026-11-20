import { toast } from 'sonner';

// Konfirmasi lewat toast setelah toggle Highlight Pekerjaan BERHASIL di server (bukan
// optimistic) — supaya user tidak ragu apakah klik bintang-nya "kena" atau belum,
// terutama saat koneksi agak lambat dan perubahan warna bintang butuh sepersekian detik
// untuk muncul kembali setelah query di-invalidate.
export function notifyHighlightToggled(isHighlighted: boolean) {
  if (isHighlighted) {
    toast.success('Ditandai sebagai Highlight Pekerjaan');
  } else {
    toast.success('Highlight dibatalkan');
  }
}
