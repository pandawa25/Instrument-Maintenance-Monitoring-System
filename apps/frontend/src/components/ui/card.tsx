import * as React from 'react';
import { cn } from '@/lib/utils';

// Container kartu generik — dipakai untuk semua "panel" konten (list wrapper,
// summary/stat card, chart card, dsb). Sebelumnya tiap halaman copy-paste div
// manual dengan class yang sama persis; sekarang terpusat di satu tempat supaya
// perubahan elevation/border cukup dilakukan sekali.
export const Card = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn('rounded-xl border border-border bg-surface shadow-card', className)}
      {...props}
    />
  ),
);
Card.displayName = 'Card';

// Varian dengan hover-lift — dipakai untuk card yang bersifat interaktif/clickable
// (mis. summary card yang bisa diklik untuk drill-down di iterasi berikutnya).
export const InteractiveCard = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        'rounded-xl border border-border bg-surface shadow-card transition-shadow duration-150 hover:shadow-card-hover',
        className,
      )}
      {...props}
    />
  ),
);
InteractiveCard.displayName = 'InteractiveCard';
