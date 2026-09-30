import { LogOut, Menu, User } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { logoutRequest } from '@/features/auth/api/auth.api';
import { useAuthStore } from '@/store/auth.store';
import { useUiStore } from '@/store/ui.store';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/shared/theme-toggle';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

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

  async function handleLogout() {
    // Cabut refresh token di server dulu (best-effort — logout lokal tetap
    // jalan walau request ini gagal, mis. koneksi putus).
    try {
      await logoutRequest();
    } catch {
      // diabaikan — bukan alasan gagal logout di sisi client
    }
    logout();
    navigate('/login');
  }

  return (
    <header className="sticky top-0 z-20 flex h-14 shrink-0 items-center justify-between gap-3 border-b border-border bg-surface/80 px-4 backdrop-blur sm:px-6">
      <div className="flex min-w-0 items-center gap-2">
        <Button variant="ghost" size="icon" className="lg:hidden" onClick={toggleMobileSidebar} aria-label="Buka menu">
          <Menu className="h-5 w-5" />
        </Button>
        <h1 className="truncate text-base font-semibold text-text">{title}</h1>
      </div>

      <div className="flex shrink-0 items-center gap-3">
        <ThemeToggle className="hidden sm:inline-flex" />

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="flex items-center gap-2 rounded-full py-0.5 pl-0.5 pr-2 transition-colors hover:bg-surface-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
            >
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary-tint text-xs font-semibold text-primary">
                {getInitials(user?.fullName)}
              </span>
              <span className="hidden text-left leading-tight sm:block">
                <span className="block text-sm font-medium text-text">{user?.fullName}</span>
                <span className="block text-[11px] text-text-muted">{user?.role}</span>
              </span>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>
              <div className="flex items-center gap-2">
                <User className="h-3.5 w-3.5" />
                Akun
              </div>
            </DropdownMenuLabel>
            <div className="px-2.5 pb-2 text-xs text-text-muted">
              <div className="truncate font-medium text-text">{user?.fullName}</div>
              <div className="truncate">{user?.email}</div>
            </div>
            <DropdownMenuSeparator />
            <div className="flex items-center justify-between px-2.5 py-1.5 sm:hidden">
              <span className="text-sm text-text">Dark Mode</span>
              <ThemeToggle />
            </div>
            <DropdownMenuItem onClick={handleLogout} className="text-danger focus:bg-danger/10 focus:text-danger">
              <LogOut className="h-4 w-4" />
              Logout
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
