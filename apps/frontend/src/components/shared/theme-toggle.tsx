import { Moon, Sun } from 'lucide-react';
import { useThemeStore } from '@/store/theme.store';
import { cn } from '@/lib/utils';

export function ThemeToggle({ className }: { className?: string }) {
  const theme = useThemeStore((s) => s.theme);
  const toggleTheme = useThemeStore((s) => s.toggleTheme);
  const isDark = theme === 'dark';

  return (
    <button
      type="button"
      role="switch"
      aria-checked={isDark}
      aria-label={isDark ? 'Ganti ke Light Mode' : 'Ganti ke Dark Mode'}
      onClick={toggleTheme}
      className={cn(
        'relative inline-flex h-7 w-12 shrink-0 items-center rounded-full border border-border bg-surface-2 transition-colors',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40',
        className,
      )}
    >
      <span
        className={cn(
          'flex h-5 w-5 items-center justify-center rounded-full bg-surface shadow-soft transition-transform duration-200',
          isDark ? 'translate-x-6' : 'translate-x-1',
        )}
      >
        {isDark ? <Moon className="h-3 w-3 text-primary" /> : <Sun className="h-3 w-3 text-warning" />}
      </span>
    </button>
  );
}
