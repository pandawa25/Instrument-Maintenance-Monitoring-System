import { Star } from 'lucide-react';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Status TUJUAN yang mau dikonfirmasi — true = mau ditandai, false = mau dibatalkan. */
  targetHighlighted: boolean;
  /** Label singkat item yang sedang ditoggle, misal tag equipment / nomor WO, untuk konteks di dialog. */
  itemLabel?: string;
  loading?: boolean;
  onConfirm: () => void;
}

// Dialog konfirmasi SEBELUM toggle Highlight Pekerjaan dieksekusi — diminta user supaya
// tidak ragu "kena atau tidak" klik bintang-nya, bukan cuma toast setelah selesai (lihat
// lib/highlight-toast.ts, tetap dipanggil setelah mutation sukses sebagai konfirmasi
// kedua). Bukan dialog destruktif (beda dari ConfirmDialog yang bertema hapus/danger),
// jadi pakai warna warning netral, bukan merah.
export function HighlightConfirmDialog({ open, onOpenChange, targetHighlighted, itemLabel, loading, onConfirm }: Props) {
  const title = targetHighlighted ? 'Tandai sebagai Highlight Pekerjaan?' : 'Batalkan Highlight Pekerjaan?';
  const description = targetHighlighted
    ? `${itemLabel ? `"${itemLabel}" akan` : 'Pekerjaan ini akan'} ditandai sebagai Highlight Pekerjaan dan muncul di halaman Highlight Pekerjaan.`
    : `${itemLabel ? `"${itemLabel}" akan` : 'Pekerjaan ini akan'} dihapus dari daftar Highlight Pekerjaan.`;
  const confirmLabel = targetHighlighted ? 'Ya, Tandai' : 'Ya, Batalkan';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-warning/10 text-warning">
              <Star className={targetHighlighted ? 'h-5 w-5' : 'h-5 w-5 fill-warning'} />
            </div>
            <DialogTitle className="pt-1.5">{title}</DialogTitle>
          </div>
        </DialogHeader>
        <p className="text-sm text-text-muted">{description}</p>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Batal
          </Button>
          <Button variant="default" onClick={onConfirm} disabled={loading}>
            {loading ? 'Memproses...' : confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
