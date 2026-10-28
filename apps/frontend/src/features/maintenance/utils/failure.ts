import type { FailureCategory, FailureMode } from '../types/maintenance.types';

// Satu sumber untuk label & teks bantuan Failure Category / Failure Mode — sebelumnya
// diduplikasi di form, halaman detail, dan 2 komponen dashboard.

export const FAILURE_CATEGORY_OPTIONS: { value: FailureCategory; label: string; hint: string }[] = [
  { value: 'INSTRUMENT', label: 'Instrument', hint: 'Perangkat ukur / final element itu sendiri rusak (sensor, transmitter, positioner, gauge).' },
  { value: 'ELECTRICAL', label: 'Electrical', hint: 'Catu daya, kabel, grounding, terminal, barrier/isolator, coil solenoid.' },
  { value: 'MECHANICAL', label: 'Mechanical', hint: 'Bagian mekanik: body/stem/seal valve, actuator, tubing/impulse line, mounting, kebocoran fisik.' },
  { value: 'COMMUNICATION', label: 'Communication', hint: 'Link komunikasi putus/error: HART, Fieldbus, Modbus, jaringan.' },
  { value: 'CONFIGURATION', label: 'Configuration', hint: 'Salah setting: parameter, range, scaling, tuning.' },
  { value: 'CALIBRATION', label: 'Calibration', hint: 'Geser / di luar toleransi dan butuh kalibrasi atau adjust (perangkat masih sehat).' },
  { value: 'PROCESS', label: 'Process', hint: 'Kondisi proses di luar normal yang memengaruhi pembacaan — bukan kerusakan perangkat.' },
  { value: 'CONTROL_SYSTEM', label: 'Control System (DCS/PLC/SIS)', hint: 'I/O card, controller, logic, atau software DCS/PLC/SIS.' },
  { value: 'UTILITY', label: 'Utility Supply', hint: 'Suplai pendukung: instrument air, power supply/UPS, hydraulic.' },
  { value: 'OTHER', label: 'Other / Unknown', hint: 'Di luar kategori lain, atau penyebabnya belum diketahui.' },
];

export const FAILURE_MODE_OPTIONS: { value: FailureMode; label: string }[] = [
  { value: 'NO_OUTPUT', label: 'No output / sinyal hilang' },
  { value: 'ERRATIC', label: 'Erratic / tidak stabil' },
  { value: 'DRIFT', label: 'Drift / di luar toleransi' },
  { value: 'STUCK', label: 'Stuck / tidak bergerak' },
  { value: 'LEAKAGE', label: 'Bocor' },
  { value: 'PLUGGED', label: 'Tersumbat' },
  { value: 'SPURIOUS', label: 'Alarm / trip palsu' },
  { value: 'COMMUNICATION_LOSS', label: 'Komunikasi putus' },
  { value: 'OTHER', label: 'Lainnya' },
];

export const FAILURE_CATEGORY_LABEL: Record<string, string> = Object.fromEntries(
  FAILURE_CATEGORY_OPTIONS.map((o) => [o.value, o.label]),
);

export const FAILURE_MODE_LABEL: Record<string, string> = Object.fromEntries(
  FAILURE_MODE_OPTIONS.map((o) => [o.value, o.label]),
);

export function failureCategoryLabel(value: string | null | undefined): string {
  return value ? (FAILURE_CATEGORY_LABEL[value] ?? value) : '—';
}

export function failureModeLabel(value: string | null | undefined): string {
  return value ? (FAILURE_MODE_LABEL[value] ?? value) : '—';
}
