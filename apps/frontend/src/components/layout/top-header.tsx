import { LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/store/auth.store';
import { useNavigate } from 'react-router-dom';

export function TopHeader({ title }: { title: string }) {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const navigate = useNavigate();

  return (
    <header className="flex h-14 items-center justify-between border-b border-border bg-surface px-6">
      <h1 className="text-base font-semibold text-text">{title}</h1>
      <div className="flex items-center gap-3">
        <div className="text-right leading-tight">
          <div className="text-sm font-medium text-text">{user?.fullName}</div>
          <div className="text-[11px] text-text-muted">{user?.role}</div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => {
            logout();
            navigate('/login');
          }}
        >
          <LogOut className="h-4 w-4" />
        </Button>
      </div>
    </header>
  );
}
