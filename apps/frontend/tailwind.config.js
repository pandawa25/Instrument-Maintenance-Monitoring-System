/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ['class'],
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: { DEFAULT: '#005BAC', dim: '#0B4E8F', tint: '#E7F1FB' },
        secondary: '#00AEEF',
        success: '#16A34A',
        warning: '#F59E0B',
        danger: '#DC2626',
        border: '#DDE4EC',
        surface: '#FFFFFF',
        'surface-2': '#EEF2F6',
        background: '#F5F7FA',
        text: '#152233',
        'text-muted': '#5B6B7D',
      },
      borderRadius: {
        DEFAULT: '8px',
      },
      fontFamily: {
        sans: ['IBM Plex Sans', 'system-ui', 'sans-serif'],
        mono: ['IBM Plex Mono', 'ui-monospace', 'monospace'],
      },
    },
  },
  plugins: [],
};
