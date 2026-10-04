import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export interface TabItem {
  value: string;
  label: string;
  icon?: React.ComponentType<{ className?: string }>;
}

interface TabsProps {
  tabs: TabItem[];
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

// Primitif tab generik — dipakai untuk mengelompokkan konten jadi beberapa
// kategori di satu halaman (mis. Dashboard). Sengaja tidak pakai Radix (belum
// ada dependency-nya di project ini) — pola button + role="tab" manual ini
// konsisten dengan MaintenanceStatusTabs yang sudah ada duluan di modul
// Maintenance, cuma di sini dibuat generic/reusable.
export function Tabs({ tabs, value, onChange, className }: TabsProps) {
  return (
    <div role="tablist" className={cn('flex flex-wrap gap-1 border-b border-border', className)}>
      {tabs.map((tab) => {
        const active = tab.value === value;
        const Icon = tab.icon;
        return (
          <button
            key={tab.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(tab.value)}
            className={cn(
              'flex items-center gap-1.5 border-b-2 px-3 py-2.5 text-sm font-medium transition-colors',
              active ? 'border-primary text-primary' : 'border-transparent text-text-muted hover:text-text',
            )}
          >
            {Icon && <Icon className="h-4 w-4" />}
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}

// Hanya me-render panel yang aktif — komponen lain (mis. KpiSection,
// HealthIndexSection) melakukan fetch data sendiri lewat hook, jadi tab yang
// tidak aktif sebaiknya tidak ikut ter-mount supaya tidak ada request sia-sia.
export function TabPanel({ active, children }: { active: boolean; children: ReactNode }) {
  if (!active) return null;
  return <div role="tabpanel">{children}</div>;
}
