/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ['class'],
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Semua warna dibaca dari CSS variable (lihat index.css, :root vs .dark)
        // supaya dark mode jalan otomatis lintas seluruh app tanpa ganti nama
        // class di komponen — hanya value CSS var yang berbeda per tema.
        // Format "H S% L%" (tanpa hsl()) supaya opacity modifier (bg-primary/10) tetap jalan.
        primary: {
          DEFAULT: 'hsl(var(--primary) / <alpha-value>)',
          dim: 'hsl(var(--primary-dim) / <alpha-value>)',
          tint: 'hsl(var(--primary-tint) / <alpha-value>)',
        },
        secondary: 'hsl(var(--secondary) / <alpha-value>)',
        success: 'hsl(var(--success) / <alpha-value>)',
        warning: 'hsl(var(--warning) / <alpha-value>)',
        danger: 'hsl(var(--danger) / <alpha-value>)',
        border: 'hsl(var(--border) / <alpha-value>)',
        ring: 'hsl(var(--ring) / <alpha-value>)',
        surface: 'hsl(var(--surface) / <alpha-value>)',
        'surface-2': 'hsl(var(--surface-2) / <alpha-value>)',
        'surface-3': 'hsl(var(--surface-3) / <alpha-value>)',
        background: 'hsl(var(--background) / <alpha-value>)',
        text: 'hsl(var(--text) / <alpha-value>)',
        'text-muted': 'hsl(var(--text-muted) / <alpha-value>)',
      },
      borderRadius: {
        DEFAULT: '8px',
        xl: '0.875rem',
        '2xl': '1rem',
      },
      fontFamily: {
        sans: ['IBM Plex Sans', 'system-ui', 'sans-serif'],
        mono: ['IBM Plex Mono', 'ui-monospace', 'monospace'],
      },
      boxShadow: {
        soft: '0 1px 2px 0 rgb(0 0 0 / 0.04), 0 1px 3px 0 rgb(0 0 0 / 0.06)',
      },
      keyframes: {
        'fade-in': { from: { opacity: 0 }, to: { opacity: 1 } },
        'slide-in-from-top': { from: { transform: 'translateY(-4px)', opacity: 0 }, to: { transform: 'translateY(0)', opacity: 1 } },
      },
      animation: {
        'fade-in': 'fade-in 150ms ease-out',
        'slide-in-from-top': 'slide-in-from-top 150ms ease-out',
      },
    },
  },
  plugins: [],
};
