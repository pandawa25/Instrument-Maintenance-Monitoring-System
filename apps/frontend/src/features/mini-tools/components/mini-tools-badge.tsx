import { useEffect, useRef, useState } from 'react';
import { ArrowLeftRight, Calculator, ChevronDown, Gauge, X } from 'lucide-react';
import { Tabs, type TabItem } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { UnitConverter } from './unit-converter';
import { ProcessSignalConverter } from './process-signal-converter';

const TABS: TabItem[] = [
  { value: 'unit', label: 'Konversi Unit', icon: ArrowLeftRight },
  { value: 'range', label: 'Pressure ↔ Signal', icon: Gauge },
];

const PANEL_ID = 'mini-tools-panel';

// Badge mengambang di kiri atas yang membuka panel alat bantu hitung. Dipakai di halaman login
// (belum ada sesi), jadi seluruhnya client-side — tidak ada panggilan API. Panel tetap ter-mount
// saat ditutup (hanya disembunyikan) supaya isian tidak hilang tiap dibuka-tutup.
export function MiniToolsBadge() {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState('unit');
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setOpen(false);
        buttonRef.current?.focus();
      }
    }
    function onPointerDown(e: PointerEvent) {
      const target = e.target as Node;
      if (panelRef.current?.contains(target) || buttonRef.current?.contains(target)) return;
      setOpen(false);
    }
    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('pointerdown', onPointerDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('pointerdown', onPointerDown);
    };
  }, [open]);

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls={PANEL_ID}
        className={cn(
          'fixed left-3 top-2 z-40 inline-flex h-7 items-center gap-1.5 rounded-full border border-border bg-surface/95 px-2.5 text-xs font-medium text-text shadow-card backdrop-blur',
          'transition-colors hover:bg-surface-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40',
        )}
      >
        <Calculator className="h-3.5 w-3.5 text-primary" />
        Mini Tools
        <ChevronDown className={cn('h-3 w-3 text-text-muted transition-transform', open && 'rotate-180')} />
      </button>

      <div
        id={PANEL_ID}
        ref={panelRef}
        role="dialog"
        aria-label="Mini Tools"
        hidden={!open}
        className="fixed left-3 top-11 z-40 max-h-[calc(100dvh-3.5rem)] w-[calc(100vw-1.5rem)] max-w-sm overflow-y-auto rounded-lg border border-border bg-surface p-3 shadow-card"
      >
        <div className="mb-2 flex items-start justify-between gap-2">
          <div>
            <h2 className="text-sm font-semibold text-text">Mini Tools</h2>
            <p className="text-xs text-text-muted">Kalkulator konversi instrumentasi — tanpa perlu login.</p>
          </div>
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              buttonRef.current?.focus();
            }}
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-text-muted hover:bg-surface-2 hover:text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
            aria-label="Tutup Mini Tools"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <Tabs tabs={TABS} value={tab} onChange={setTab} className="mb-3" />
        {/* Kedua panel tetap ter-mount (hanya disembunyikan) supaya isian tidak hilang saat pindah tab */}
        <div role="tabpanel" hidden={tab !== 'unit'}>
          <UnitConverter />
        </div>
        <div role="tabpanel" hidden={tab !== 'range'}>
          <ProcessSignalConverter />
        </div>
      </div>
    </>
  );
}
