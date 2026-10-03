import type { LucideIcon } from 'lucide-react';
import { Activity, CircleDot, Cpu, FlaskConical, Gauge, Radio, ShieldAlert, Tag } from 'lucide-react';

export interface TypeCategory {
  label: string;
  icon: LucideIcon;
  className: string; // warna ikon + badge, pakai token semantik yang sudah ada (bukan warna baru)
}

/**
 * Pengelompokan visual murni di frontend (tidak ada field category di DB) berdasarkan
 * prefix kode `instrument_names.code` — pola yang sama dengan `isValveInstrumentCode()`
 * di equipment.types.ts. Kalau nanti kode baru ditambahkan ke master Instrument Name dan
 * tidak match salah satu grup di bawah, otomatis jatuh ke fallback "Lainnya" (bukan error).
 */
const CATEGORY_BY_CODE: Record<string, TypeCategory> = {
  // Transmitter (ukur kontinu, output 4-20mA/HART)
  PT: { label: 'Transmitter', icon: Radio, className: 'bg-primary/10 text-primary' },
  TT: { label: 'Transmitter', icon: Radio, className: 'bg-primary/10 text-primary' },
  FT: { label: 'Transmitter', icon: Radio, className: 'bg-primary/10 text-primary' },
  LT: { label: 'Transmitter', icon: Radio, className: 'bg-primary/10 text-primary' },
  // Gauge (baca lokal, tanpa output sinyal)
  PG: { label: 'Gauge', icon: Gauge, className: 'bg-secondary/10 text-secondary' },
  TG: { label: 'Gauge', icon: Gauge, className: 'bg-secondary/10 text-secondary' },
  // Final Control Element (valve + positioner)
  CV: { label: 'Final Control', icon: CircleDot, className: 'bg-warning/10 text-warning' },
  SV: { label: 'Final Control', icon: CircleDot, className: 'bg-warning/10 text-warning' },
  KV: { label: 'Final Control', icon: CircleDot, className: 'bg-warning/10 text-warning' },
  UV: { label: 'Final Control', icon: CircleDot, className: 'bg-warning/10 text-warning' },
  VP: { label: 'Final Control', icon: CircleDot, className: 'bg-warning/10 text-warning' },
  // Analyzer
  AN: { label: 'Analyzer', icon: FlaskConical, className: 'bg-success/10 text-success' },
  // Safety / deteksi bahaya
  GD: { label: 'Safety Device', icon: ShieldAlert, className: 'bg-danger/10 text-danger' },
  // Sensor kondisi (bukan proses utama)
  VS: { label: 'Sensor', icon: Activity, className: 'bg-secondary/10 text-secondary' },
  // Controller / komunikasi
  PLC: { label: 'Controller', icon: Cpu, className: 'bg-text-muted/10 text-text-muted' },
  RTU: { label: 'Controller', icon: Cpu, className: 'bg-text-muted/10 text-text-muted' },
  FC: { label: 'Controller', icon: Cpu, className: 'bg-text-muted/10 text-text-muted' },
};

const FALLBACK_CATEGORY: TypeCategory = {
  label: 'Lainnya',
  icon: Tag,
  className: 'bg-surface-2 text-text-muted',
};

export function getTypeCategory(instrumentCode: string | null | undefined): TypeCategory {
  if (!instrumentCode) return FALLBACK_CATEGORY;
  return CATEGORY_BY_CODE[instrumentCode] ?? FALLBACK_CATEGORY;
}
