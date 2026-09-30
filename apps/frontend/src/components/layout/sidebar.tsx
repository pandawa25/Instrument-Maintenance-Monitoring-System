import { NavLink } from 'react-router-dom';
import type { LucideIcon } from 'lucide-react';
import {
  LayoutDashboard,
  MapPinned,
  Gauge,
  Tag,
  Wrench,
  Users,
  Boxes,
  CalendarClock,
  Building2,
  ListChecks,
  PackageSearch,
  ChevronsLeft,
  ChevronsRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/store/auth.store';
import { useUiStore } from '@/store/ui.store';
import { useLayoutPreferencesStore } from '@/store/layout-preferences.store';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

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
    items: [
      { to: '/maintenance', label: 'Corrective Maintenance', icon: Wrench, roles: ['Admin', 'Viewer'] },
      { to: '/pm-programs', label: 'Preventive Maintenance', icon: CalendarClock, roles: ['Admin', 'Viewer'] },
    ],
  },
  {
    label: 'Master Data',
    items: [
      { to: '/areas', label: 'Area', icon: MapPinned, roles: ['Admin', 'Viewer'] },
      { to: '/equipment', label: 'Equipment', icon: Gauge, roles: ['Admin', 'Viewer'] },
      { to: '/instrument-names', label: 'Instrument Name', icon: Tag, roles: ['Admin', 'Viewer'] },
      { to: '/vendors', label: 'Vendor', icon: Building2, roles: ['Admin', 'Viewer'] },
      { to: '/pm-activity-types', label: 'PM Activity Type', icon: ListChecks, roles: ['Admin', 'Viewer'] },
      { to: '/spare-parts', label: 'Spare Part / Material', icon: PackageSearch, roles: ['Admin', 'Viewer'] },
    ],
  },
  {
    label: 'Administrasi',
    items: [{ to: '/users', label: 'User Management', icon: Users, roles: ['Admin'] }],
  },
];

function NavItemLink({ item, collapsed, onNavigate }: { item: NavItem; collapsed: boolean; onNavigate: () => void }) {
  const link = (
    <NavLink
      to={item.to}
      onClick={onNavigate}
      className={({ isActive }) =>
        cn(
          'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-text-muted transition-colors hover:bg-primary-tint hover:text-primary',
          collapsed && 'justify-center px-0',
          isActive && 'bg-primary text-white shadow-sm hover:bg-primary hover:text-white',
        )
      }
    >
      <item.icon className="h-4 w-4 shrink-0" />
      {!collapsed && item.label}
    </NavLink>
  );

  if (!collapsed) return link;

  return (
    <Tooltip>
      <TooltipTrigger asChild>{link}</TooltipTrigger>
      <TooltipContent side="right">{item.label}</TooltipContent>
    </Tooltip>
  );
}

export function Sidebar() {
  const role = useAuthStore((s) => s.user?.role);
  const mobileSidebarOpen = useUiStore((s) => s.mobileSidebarOpen);
  const closeMobileSidebar = useUiStore((s) => s.closeMobileSidebar);
  const collapsed = useLayoutPreferencesStore((s) => s.sidebarCollapsed);
  const toggleCollapsed = useLayoutPreferencesStore((s) => s.toggleSidebarCollapsed);

  return (
    <aside
      className={cn(
        'fixed inset-y-0 left-0 z-40 flex flex-col border-r border-border bg-surface transition-[width,transform] duration-200 ease-in-out',
        'lg:static lg:translate-x-0',
        collapsed ? 'w-[4.5rem]' : 'w-64',
        mobileSidebarOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full',
      )}
    >
      <div className={cn('flex items-center gap-2.5 border-b border-border px-5 py-4', collapsed && 'justify-center px-3')}>
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary text-white shadow-sm">
          <Boxes className="h-5 w-5" />
        </div>
        {!collapsed && (
          <div className="min-w-0">
            <div className="truncate text-sm font-semibold leading-tight text-text">IMMS</div>
            <div className="truncate text-[11px] leading-tight text-text-muted">Instrument Maintenance</div>
          </div>
        )}
      </div>

      <nav className="flex-1 space-y-5 overflow-y-auto overflow-x-hidden px-3 py-4">
        {NAV_GROUPS.map((group, idx) => {
          const items = group.items.filter((item) => !role || item.roles.includes(role));
          if (items.length === 0) return null;

          return (
            <div key={group.label ?? idx}>
              {group.label && !collapsed && (
                <div className="mb-1.5 px-3 text-[11px] font-semibold uppercase tracking-wider text-text-muted/70">
                  {group.label}
                </div>
              )}
              {group.label && collapsed && <div className="mx-3 mb-1.5 h-px bg-border" />}
              <div className="space-y-1">
                {items.map((item) => (
                  <NavItemLink key={item.to} item={item} collapsed={collapsed} onNavigate={closeMobileSidebar} />
                ))}
              </div>
            </div>
          );
        })}
      </nav>

      <div className="border-t border-border p-3 hidden lg:block">
        <button
          type="button"
          onClick={toggleCollapsed}
          className={cn(
            'flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium text-text-muted transition-colors hover:bg-surface-2 hover:text-text',
            collapsed && 'justify-center px-0',
          )}
          aria-label={collapsed ? 'Perluas sidebar' : 'Ciutkan sidebar'}
        >
          {collapsed ? <ChevronsRight className="h-4 w-4" /> : <ChevronsLeft className="h-4 w-4" />}
          {!collapsed && 'Ciutkan menu'}
        </button>
      </div>
    </aside>
  );
}
