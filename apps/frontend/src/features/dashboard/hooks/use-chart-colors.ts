import { useMemo } from 'react';
import { useThemeStore } from '@/store/theme.store';

const VAR_NAMES = ['primary', 'secondary', 'success', 'warning', 'danger', 'border', 'text', 'text-muted'] as const;

function readCssVar(name: string): string {
  const value = getComputedStyle(document.documentElement).getPropertyValue(`--${name}`).trim();
  // Variable disimpan sebagai "H S% L%" (tanpa hsl()) — lihat index.css — supaya
  // dipakai Tailwind dengan opacity modifier. Recharts butuh string warna utuh.
  return value ? `hsl(${value})` : '#000000';
}

// Recharts butuh literal color string (bukan class Tailwind), jadi warna dibaca
// langsung dari CSS variable yang sedang aktif — otomatis ikut light/dark
// karena `theme` di sini cuma dipakai sebagai dependency supaya hook
// re-compute saat class "dark" di <html> berubah (readCssVar tidak reaktif
// sendiri terhadap perubahan DOM).
export function useChartColors() {
  const theme = useThemeStore((s) => s.theme);

  return useMemo(() => {
    const colors = Object.fromEntries(VAR_NAMES.map((name) => [name, readCssVar(name)])) as Record<
      (typeof VAR_NAMES)[number],
      string
    >;
    return {
      ...colors,
      categoryPalette: [colors.primary, colors.secondary, colors.warning, colors.danger, colors.success, '#7C3AED', '#0D9488'],
    };
  }, [theme]);
}
