import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface LayoutPreferencesState {
  sidebarCollapsed: boolean;
  toggleSidebarCollapsed: () => void;
}

// Terpisah dari ui.store (yang menyimpan state sesaat drawer mobile) — ini
// preferensi tampilan yang wajar diingat lintas sesi, seperti theme.
export const useLayoutPreferencesStore = create<LayoutPreferencesState>()(
  persist(
    (set) => ({
      sidebarCollapsed: false,
      toggleSidebarCollapsed: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
    }),
    { name: 'imms-layout-preferences' },
  ),
);
