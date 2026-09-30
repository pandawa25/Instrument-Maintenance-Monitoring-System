import { LogOut, Menu } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { logoutRequest } from '@/features/auth/api/auth.api';
import { useAuthStore } from '@/store/auth.store';
import { useUiStore } from '@/store/ui.store';

function getInitials(fullName?: string) {
  if (!fullName) return '?';
  return fullName
    .trim()
    .split(/\s+/)
    .map((part) => part[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

export function TopHeader({ title }: { title: string }) {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const toggleMobileSidebar = useUiStore((s) => s.toggleMobileSidebar);
  const navigate = useNavigate();

  return (
    <header className="sticky top-0 z-20 flex h-14 shrink-0 items-center justify-between gap-3 border-b border-border bg-surface/80 px-4 backdrop-blur sm:px-6">
      <div className="flex min-w-0 items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          className="lg:hidden"
          onClick={toggleMobileSidebar}
          aria-label="Buka menu"
        >
          <Menu className="h-5 w-5" />
        </Button>
        <h1 className="truncate text-base font-semibold text-text">{title}</h1>
      </div>

      <div className="flex shrink-0 items-center gap-3">
        <div className="hidden text-right leading-tight sm:block">
          <div className="text-sm font-medium text-text">{user?.fullName}</div>
          <div className="text-[11px] text-text-muted">{user?.role}</div>
        </div>
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary-tint text-xs font-semibold text-primary">
          {getInitials(user?.fullName)}
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={async () => {
            // Cabut refresh token di server dulu (best-effort — logout lokal
            // tetap jalan walau request ini gagal, mis. koneksi putus).
            try {
              await logoutRequest();
            } catch {
              // diabaikan — bukan alasan gagal logout di sisi client
            }
            logout();
            navigate('/login');
          }}
          aria-label="Logout"
        >
          <LogOut className="h-4 w-4" />
        </Button>
      </div>
    </header>
  );
}
