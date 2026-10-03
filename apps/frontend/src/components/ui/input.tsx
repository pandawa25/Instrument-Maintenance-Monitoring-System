import * as React from 'react';
import { cn } from '@/lib/utils';

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        // text-base (16px) di mobile mencegah auto-zoom iOS Safari saat fokus ke input;
        // text-sm (14px) dipakai kembali mulai breakpoint sm ke atas (desktop/tablet).
        'flex h-9 w-full rounded-md border border-border bg-surface px-3 py-1 text-base text-text placeholder:text-text-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 disabled:cursor-not-allowed disabled:opacity-50 sm:text-sm',
        className,
      )}
      {...props}
    />
  ),
);
Input.displayName = 'Input';
