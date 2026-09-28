import { NavLink } from 'react-router-dom';
import type { LucideIcon } from 'lucide-react';
import { LayoutDashboard, MapPinned, Gauge, Wrench, Users, Boxes } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/store/auth.store';
import { useUiStore } from '@/store/ui.store';

interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  roles: string[];
}

interface NavGroup {
  label?: string;
  items: NavItem[];
}

// Menu dikelompokkan sesuai struktur informasi: Dashboard berdiri sendiri,
// lalu Kegiatan Maintenance, Master Data, dan Administrasi (Admin only).
const NAV_GROUPS: NavGroup[] = [
  {
    items: [{ to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ['Admin', 'Viewer'] }],
  },
  {
    label: 'Kegiatan Maintenance',
    items: [{ to: '/maintenance', label: 'Corrective Maintenance', icon: Wrench, roles: ['Admin', 'Viewer'] }],
  },
  {
    label: 'Master Data',
    items: [
      { to: '/areas', label: 'Area', icon: MapPinned, roles: ['Admin', 'Viewer'] },
      { to: '/instruments', label: 'Instrument', icon: Gauge, roles: ['Admin', 'Viewer'] },
    ],
  },
  {
    label: 'Administrasi',
    items: [{ to: '/users', label: 'User Management', icon: Users, roles: ['Admin'] }],
  },
];

export function Sidebar() {
  const role = useAuthStore((s) => s.user?.role);
  const mobileSidebarOpen = useUiStore((s) => s.mobileSidebarOpen);
  const closeMobileSidebar = useUiStore((s) => s.closeMobileSidebar);

  return (
    <aside
      className={cn(
        'fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-border bg-surface transition-transform duration-200 ease-in-out',
        'lg:static lg:translate-x-0',
        mobileSidebarOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full',
      )}
    >
      <div className="flex items-center gap-2.5 border-b border-border px-5 py-4">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-white shadow-sm">
          <Boxes className="h-5 w-5" />
        </div>
        <div>
          <div className="text-sm font-semibold leading-tight text-text">IMMS</div>
          <div className="text-[11px] leading-tight text-text-muted">Instrument Maintenance</div>
        </div>
      </div>

      <nav className="flex-1 space-y-5 overflow-y-auto px-3 py-4">
        {NAV_GROUPS.map((group, idx) => {
          const items = group.items.filter((item) => !role || item.roles.includes(role));
          if (items.length === 0) return null;

          return (
            <div key={group.label ?? idx}>
              {group.label && (
                <div className="mb-1.5 px-3 text-[11px] font-semibold uppercase tracking-wider text-text-muted/70">
                  {group.label}
                </div>
              )}
              <div className="space-y-1">
                {items.map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    onClick={closeMobileSidebar}
                    className={({ isActive }) =>
                      cn(
                        'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-text-muted transition-colors hover:bg-primary-tint hover:text-primary',
                        isActive && 'bg-primary text-white shadow-sm hover:bg-primary hover:text-white',
                      )
                    }
                  >
                    <item.icon className="h-4 w-4 shrink-0" />
                    {item.label}
                  </NavLink>
                ))}
              </div>
            </div>
          );
        })}
      </nav>
    </aside>
  );
}
