import { Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface Props {
  isHighlighted: boolean;
  onToggle: () => void;
  // Tampil tapi non-interaktif untuk user yang hanya punya akses view (bukan edit) —
  // konsisten dengan pola enabled/disabled tombol aksi lain di tabel (lihat bulk-action-bar.tsx).
  canEdit: boolean;
  isLoading?: boolean;
}

/**
 * Tombol bintang untuk fitur Highlight Pekerjaan — dipakai di tabel/detail Corrective
 * Maintenance, PM Period Execution, dan Work Order (lihat docs/roadmap.md). Shared/global,
 * bukan per-user: semua yang punya akses view modul tsb melihat state yang sama.
 */
export function HighlightToggleButton({ isHighlighted, onToggle, canEdit, isLoading }: Props) {
  return (
    <Button
      variant="ghost"
      size="icon"
      disabled={!canEdit || isLoading}
      onClick={(e) => {
        e.stopPropagation();
        onToggle();
      }}
      title={isHighlighted ? 'Batalkan highlight' : 'Tandai sebagai highlight'}
      aria-label={isHighlighted ? 'Batalkan highlight' : 'Tandai sebagai highlight'}
      aria-pressed={isHighlighted}
    >
      <Star className={cn('h-4 w-4', isHighlighted ? 'fill-warning text-warning' : 'text-text-muted')} />
    </Button>
  );
}
