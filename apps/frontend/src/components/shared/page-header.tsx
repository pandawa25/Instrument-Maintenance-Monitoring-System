import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

interface Props {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: ReactNode;
}

// Header standar untuk semua halaman list/module — dulu markup ini di-copy-paste
// manual di tiap page (lihat git history), sekarang 1 komponen supaya konsisten
// dan gampang di-adjust sekali untuk semua modul.
export function PageHeader({ icon: Icon, title, description, action }: Props) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-tint text-primary">
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-text">{title}</h2>
          <p className="text-sm text-text-muted">{description}</p>
        </div>
      </div>
      {action}
    </div>
  );
}
