import { Outlet } from 'react-router-dom';
import { Sidebar } from './sidebar';
import { TopHeader } from './top-header';
import { useUiStore } from '@/store/ui.store';

export function DashboardLayout({ title }: { title: string }) {
  const mobileSidebarOpen = useUiStore((s) => s.mobileSidebarOpen);
  const closeMobileSidebar = useUiStore((s) => s.closeMobileSidebar);

  return (
    <div className="flex h-screen bg-background">
      <Sidebar />

      {/* Backdrop drawer mobile — sidebar sendiri handle transisi/posisi, ini cuma overlay klik-untuk-tutup */}
      {mobileSidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/40 lg:hidden"
          onClick={closeMobileSidebar}
          aria-hidden="true"
        />
      )}

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <TopHeader title={title} />
        <main className="flex-1 overflow-y-auto p-4 sm:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
