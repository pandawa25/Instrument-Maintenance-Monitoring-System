import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type Theme = 'light' | 'dark';

interface ThemeState {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
}

function applyThemeClass(theme: Theme) {
  document.documentElement.classList.toggle('dark', theme === 'dark');
}

// Persist ke localStorage (key: imms-theme) — dibaca juga oleh inline script
// di index.html supaya class "dark" sudah terpasang SEBELUM React mount,
// menghindari flash light->dark saat reload (FOUC).
export const useThemeStore = create<ThemeState>()(
  persist(
    (set, get) => ({
      theme: 'light',
      setTheme: (theme) => {
        applyThemeClass(theme);
        set({ theme });
      },
      toggleTheme: () => {
        const next: Theme = get().theme === 'dark' ? 'light' : 'dark';
        applyThemeClass(next);
        set({ theme: next });
      },
    }),
    {
      name: 'imms-theme',
      onRehydrateStorage: () => (state) => {
        // Sinkronkan class di <html> dengan state hasil rehydrate — inline
        // script di index.html sudah menebak duluan, ini memastikan konsisten
        // kalau ada mismatch (mis. localStorage diubah manual).
        if (state) applyThemeClass(state.theme);
      },
    },
  ),
);
