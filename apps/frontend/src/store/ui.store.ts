import { create } from 'zustand';

interface UiState {
  mobileSidebarOpen: boolean;
  toggleMobileSidebar: () => void;
  closeMobileSidebar: () => void;
}

// Sengaja tidak di-persist — state UI sesaat (buka/tutup drawer di mobile),
// tidak perlu ikut tersimpan lintas reload seperti auth.store.
export const useUiStore = create<UiState>((set) => ({
  mobileSidebarOpen: false,
  toggleMobileSidebar: () => set((s) => ({ mobileSidebarOpen: !s.mobileSidebarOpen })),
  closeMobileSidebar: () => set({ mobileSidebarOpen: false }),
}));
