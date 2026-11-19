import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50 disabled:active:scale-100',
  {
    variants: {
      // bg-primary-btn/bg-danger-btn (BUKAN bg-primary/bg-danger langsung) — token
      // terpisah khusus background solid dengan teks putih di atasnya, supaya
      // kontras lolos WCAG 4.5:1 di dark mode tanpa mengubah --primary/--danger
      // yang juga dipakai sebagai warna teks link/ikon di tempat lain (butuh
      // lightness tinggi untuk kontras di atas background gelap — arah
      // berlawanan dari kebutuhan di sini). Lihat catatan di index.css & Risk #24.
      variant: {
        default: 'bg-primary-btn text-white shadow-sm hover:bg-primary-btn-dim hover:shadow-md',
        outline: 'border border-border bg-surface shadow-sm hover:bg-surface-2 hover:border-text-muted/40 text-text',
        ghost: 'hover:bg-surface-2 text-text',
        danger: 'bg-danger-btn text-white shadow-sm hover:bg-danger-btn/90 hover:shadow-md',
      },
      size: {
        default: 'h-9 px-4 py-2',
        sm: 'h-8 px-3 text-xs',
        // 44x44 — touch-target minimum WCAG 2.5.5/mobile a11y guideline (sebelumnya
        // 36x36/h-9 w-9, dipakai di SEMUA tombol aksi icon-only tabel — Risk #24).
        icon: 'h-11 w-11',
      },
    },
    defaultVariants: { variant: 'default', size: 'default' },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />;
  },
);
Button.displayName = 'Button';
