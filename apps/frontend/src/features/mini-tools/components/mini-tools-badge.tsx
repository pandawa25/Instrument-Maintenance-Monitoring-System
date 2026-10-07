import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { Calculator, ChevronDown, X } from 'lucide-react';
import { Tabs, type TabItem } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { UnitConverter } from './unit-converter';
import { ProcessSignalConverter } from './process-signal-converter';
import { DpFlowConverter } from './dp-flow-converter';

const TABS: TabItem[] = [
  { value: 'unit', label: 'Unit' },
  { value: 'signal', label: 'Pressure ↔ Signal' },
  { value: 'flow', label: 'Pressure ↔ Flow' },
];

const PANEL_MAX_WIDTH = 420;
const VIEWPORT_MARGIN = 12;
const MIN_PANEL_HEIGHT = 240;

interface PanelPosition {
  top: number;
  left: number;
  width: number;
  maxHeight: number;
}

// Panel `fixed` supaya tidak terpotong container induk (mis. panel kiri login yang overflow-hidden),
// posisinya dihitung dari badge: tepat di bawahnya, rata kiri, lalu dijepit agar tidak keluar layar.
function computePosition(anchor: HTMLElement): PanelPosition {
  const rect = anchor.getBoundingClientRect();
  const width = Math.min(PANEL_MAX_WIDTH, window.innerWidth - VIEWPORT_MARGIN * 2);
  const top = rect.bottom + 8;
  const left = Math.min(Math.max(rect.left, VIEWPORT_MARGIN), window.innerWidth - width - VIEWPORT_MARGIN);
  return { top, left, width, maxHeight: Math.max(MIN_PANEL_HEIGHT, window.innerHeight - top - VIEWPORT_MARGIN) };
}

// Badge "Mini Tools" yang membuka panel alat bantu hitung. Dipakai di halaman login (belum ada
// sesi), jadi seluruhnya client-side — tidak ada panggilan API. Badge ikut alur layout induknya
// (halaman login yang menentukan letaknya); panel tetap ter-mount saat ditutup (hanya
// disembunyikan) supaya isian tidak hilang tiap dibuka-tutup.
export function MiniToolsBadge({ className }: { className?: string }) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState('unit');
  const [position, setPosition] = useState<PanelPosition | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const panelId = useId();

  const reposition = useCallback(() => {
    if (buttonRef.current) setPosition(computePosition(buttonRef.current));
  }, []);

  useLayoutEffect(() => {
    if (!open) return;
    reposition();
    window.addEventListener('resize', reposition);
    window.addEventListener('scroll', reposition, true);
    return () => {
      window.removeEventListener('resize', reposition);
      window.removeEventListener('scroll', reposition, true);
    };
  }, [open, reposition]);

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
        aria-controls={panelId}
        className={cn(
          'inline-flex h-7 items-center gap-1.5 rounded-full border border-border bg-surface/95 px-2.5 text-xs font-medium text-text shadow-card backdrop-blur',
          'transition-colors hover:bg-surface-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40',
          className,
        )}
      >
        <Calculator className="h-3.5 w-3.5 text-primary" />
        Mini Tools
        <ChevronDown className={cn('h-3 w-3 text-text-muted transition-transform', open && 'rotate-180')} />
      </button>

      <div
        id={panelId}
        ref={panelRef}
        role="dialog"
        aria-label="Mini Tools"
        hidden={!open}
        style={position ?? undefined}
        className="fixed z-40 overflow-y-auto rounded-lg border border-border bg-surface p-3 shadow-card"
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
        {/* Semua panel tetap ter-mount (hanya disembunyikan) supaya isian tidak hilang saat pindah tab */}
        <div role="tabpanel" hidden={tab !== 'unit'}>
          <UnitConverter />
        </div>
        <div role="tabpanel" hidden={tab !== 'signal'}>
          <ProcessSignalConverter />
        </div>
        <div role="tabpanel" hidden={tab !== 'flow'}>
          <DpFlowConverter />
        </div>
      </div>
    </>
  );
}
