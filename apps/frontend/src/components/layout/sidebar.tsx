import { NavLink } from 'react-router-dom';
import type { LucideIcon } from 'lucide-react';
import {
  LayoutDashboard,
  MapPinned,
  Gauge,
  Tag,
  Wrench,
  Users,
  CalendarClock,
  Building2,
  ListChecks,
  PackageSearch,
  ArrowDownToLine,
  ArrowUpFromLine,
  BarChart3,
  ShieldCheck,
  ChevronsLeft,
  ChevronsRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/store/auth.store';
import { useUiStore } from '@/store/ui.store';
import { useLayoutPreferencesStore } from '@/store/layout-preferences.store';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import type { PermissionModule } from '@/types/permissions';

interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  // Modul yang menentukan tampil/tidaknya item ini (dicek lewat permissions.<module>.view
  // hasil GET /auth/me). undefined = selalu Admin only (User Management, Role & Permission
  // settings) — keduanya TIDAK ikut matriks, lihat PermissionsService di backend.
  module?: PermissionModule;
  adminOnly?: boolean;
  // true = NavLink exact match. Dipakai untuk item yang path-nya adalah prefix dari
  // sibling lain (mis. "/spare-parts" vs "/spare-parts/stock-in") supaya tidak ikut
  // ter-highlight saat sibling-nya aktif.
  end?: boolean;
}

interface NavGroup {
  label?: string;
  items: NavItem[];
}

// Menu dikelompokkan sesuai struktur informasi: Dashboard (utama + Inventory)
// berdiri sendiri di atas, lalu Kegiatan Maintenance, Master Data, Spare Part /
// Material, dan Administrasi (Admin only). Visibilitas tiap item (selain
// Administrasi) sekarang mengikuti matriks hak akses (role_permissions), BUKAN
// hardcode nama role — supaya Admin bisa mengatur ulang lewat halaman Matriks
// Role & Permission tanpa perlu ganti kode.
const NAV_GROUPS: NavGroup[] = [
  {
    items: [
      { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, module: 'DASHBOARD' },
      { to: '/spare-parts/dashboard', label: 'Inventory Dashboard', icon: BarChart3, module: 'SPARE_PART' },
    ],
  },
  {
    label: 'Kegiatan Maintenance',
    items: [
      { to: '/maintenance', label: 'Corrective Maintenance', icon: Wrench, module: 'CORRECTIVE_MAINTENANCE' },
      { to: '/pm-programs', label: 'Preventive Maintenance', icon: CalendarClock, module: 'PM_PROGRAM' },
    ],
  },
  {
    label: 'Master Data',
    items: [
      { to: '/areas', label: 'Area', icon: MapPinned, module: 'AREA' },
      { to: '/equipment', label: 'Equipment', icon: Gauge, module: 'EQUIPMENT' },
      { to: '/instrument-names', label: 'Instrument Name', icon: Tag, module: 'INSTRUMENT_NAME' },
      { to: '/vendors', label: 'Vendor', icon: Building2, module: 'VENDOR' },
      { to: '/pm-activity-types', label: 'PM Activity Type', icon: ListChecks, module: 'PM_ACTIVITY_TYPE' },
    ],
  },
  {
    label: 'Spare Part / Material',
    items: [
      { to: '/spare-parts', label: 'Master Spare Part', icon: PackageSearch, module: 'SPARE_PART', end: true },
      { to: '/spare-parts/stock-in', label: 'Stock In', icon: ArrowDownToLine, module: 'SPARE_PART' },
      { to: '/spare-parts/stock-out', label: 'Stock Out', icon: ArrowUpFromLine, module: 'SPARE_PART' },
    ],
  },
  {
    label: 'Administrasi',
    items: [
      { to: '/users', label: 'User Management', icon: Users, adminOnly: true },
      { to: '/settings/roles', label: 'Role & Permission', icon: ShieldCheck, adminOnly: true },
    ],
  },
];

function NavItemLink({ item, collapsed, onNavigate }: { item: NavItem; collapsed: boolean; onNavigate: () => void }) {
  const link = (
    <NavLink
      to={item.to}
      end={item.end}
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
  const permissions = useAuthStore((s) => s.user?.permissions);
  const mobileSidebarOpen = useUiStore((s) => s.mobileSidebarOpen);
  const closeMobileSidebar = useUiStore((s) => s.closeMobileSidebar);
  const collapsed = useLayoutPreferencesStore((s) => s.sidebarCollapsed);
  const toggleCollapsed = useLayoutPreferencesStore((s) => s.toggleSidebarCollapsed);

  function canSee(item: NavItem): boolean {
    if (item.adminOnly) return role === 'Admin';
    if (!item.module) return true;
    return permissions?.[item.module]?.view ?? false;
  }

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
        <img src="/brand/app-mark.png" alt="IMMS" className="h-8 w-8 shrink-0 rounded-lg" />
        {!collapsed && <img src="/brand/wordmark-h36.png" alt="IMMS — Instrument Maintenance & Monitoring System" className="h-5 w-auto" />}
      </div>

      <nav className="flex-1 space-y-5 overflow-y-auto overflow-x-hidden px-3 py-4">
        {NAV_GROUPS.map((group, idx) => {
          const items = group.items.filter(canSee);
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
