import * as React from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

// Native <select> yang di-styling — cukup untuk MVP filter/status dropdown.
// Bisa diganti ke @radix-ui/react-select saat butuh custom option (search, grouping).
export const Select = React.forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(
  ({ className, children, ...props }, ref) => (
    <div className="relative">
      <select
        ref={ref}
        className={cn(
          'h-9 w-full appearance-none rounded-md border border-border bg-surface px-3 pr-8 text-sm text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40',
          className,
        )}
        {...props}
      >
        {children}
      </select>
      <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
    </div>
  ),
);
Select.displayName = 'Select';
