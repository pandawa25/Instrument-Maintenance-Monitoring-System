import { NavLink } from 'react-router-dom';
import { LayoutDashboard, MapPinned, Gauge, Wrench, Users, Gauge as LogoIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/store/auth.store';

const NAV_ITEMS = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ['Admin', 'Viewer'] },
  { to: '/areas', label: 'Area', icon: MapPinned, roles: ['Admin', 'Viewer'] },
  { to: '/instruments', label: 'Instrument', icon: Gauge, roles: ['Admin', 'Viewer'] },
  { to: '/maintenance', label: 'Corrective Maintenance', icon: Wrench, roles: ['Admin', 'Viewer'] },
  { to: '/users', label: 'User Management', icon: Users, roles: ['Admin'] },
];

export function Sidebar() {
  const role = useAuthStore((s) => s.user?.role);

  return (
    <aside className="flex h-screen w-60 flex-col border-r border-border bg-surface">
      <div className="flex items-center gap-2 px-5 py-4 border-b border-border">
        <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-white">
          <LogoIcon className="h-4 w-4" />
        </div>
        <div>
          <div className="text-sm font-semibold leading-tight text-text">IMMS</div>
          <div className="text-[11px] text-text-muted leading-tight">Instrument Maintenance</div>
        </div>
      </div>

      <nav className="flex-1 space-y-1 px-3 py-4">
        {NAV_ITEMS.filter((item) => !role || item.roles.includes(role)).map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-text-muted transition-colors hover:bg-primary-tint hover:text-primary',
                isActive && 'bg-primary-tint text-primary',
              )
            }
          >
            <item.icon className="h-4 w-4" />
            {item.label}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
