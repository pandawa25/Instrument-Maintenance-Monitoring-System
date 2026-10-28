// Logika murni (tanpa Prisma/Nest) untuk menyusun timeline History Maintenance satu equipment
// dari baris Corrective Maintenance + eksekusi Preventive Maintenance. Dipisah supaya bisa
// diuji tanpa database.

export type HistoryEventKind = 'CORRECTIVE' | 'PREVENTIVE';

export interface HistoryMaterial {
  sparePartId: string;
  kimap: string;
  name: string;
  unit: string;
  quantity: number;
  remarks: string | null;
  // true = stok BENAR-BENAR terpotong. Di sistem ini stok baru berkurang saat Corrective
  // Maintenance berstatus COMPLETED; material di tiket yang belum selesai baru berupa kebutuhan.
  consumed: boolean;
}

export interface CorrectiveDetail {
  spkNumber: string | null;
  failureCategory: string;
  failureMode: string | null;
  priority: string;
  problemDescription: string;
  rootCause: string | null;
  actionTaken: string | null;
  downtimeHours: number | null;
  technician: string;
  additionalTechnicians: string[];
  completionDate: string | null;
  workOrderNumber: string | null;
  notificationNumber: string | null;
}

export interface PreventiveDetail {
  programId: string;
  programName: string;
  periodNumber: number;
  plannedDate: string;
  vendorName: string | null;
  result: string | null;
  findings: string | null;
  actionTaken: string | null;
  vendorPersonnel: string | null;
  workOrderNumber: string | null;
  checklistTotal: number;
  checklistNotOk: number;
}

export interface HistoryEvent {
  id: string;
  kind: HistoryEventKind;
  /** yyyy-mm-dd — tanggal kegiatan (CM: tanggal maintenance; PM: tanggal eksekusi). */
  date: string;
  status: string;
  title: string;
  remarks: string | null;
  materials: HistoryMaterial[];
  corrective: CorrectiveDetail | null;
  preventive: PreventiveDetail | null;
  /** Hanya untuk urutan stabil; tidak ditampilkan. */
  createdAt: string;
}

export interface MaterialUsageSummary {
  sparePartId: string;
  kimap: string;
  name: string;
  unit: string;
  totalQuantity: number;
  usageCount: number;
}

export interface HistorySummary {
  totalEvents: number;
  correctiveCount: number;
  preventiveCount: number;
  /** Corrective yang belum selesai (bukan COMPLETED/CANCELLED). */
  openCorrectiveCount: number;
  totalDowntimeHours: number;
  lastActivityDate: string | null;
  /** Rekap pemakaian material — hanya dari Corrective yang COMPLETED (stok benar-benar terpakai). */
  materialUsage: MaterialUsageSummary[];
}

// ---- Bentuk minimal baris DB yang dibutuhkan (diisi repository) ----

export interface CorrectiveRow {
  id: string;
  spkNumber: string | null;
  maintenanceDate: Date;
  completionDate: Date | null;
  failureCategory: string;
  failureMode?: string | null;
  priority: string;
  status: string;
  problemDescription: string;
  rootCause: string | null;
  actionTaken: string | null;
  downtimeHours: unknown; // Prisma Decimal | null
  remarks: string | null;
  workOrderNumber: string | null;
  notificationNumber: string | null;
  createdAt: Date;
  technician: { fullName: string };
  additionalTechnicians: { user: { fullName: string } }[];
  materials: {
    quantity: unknown; // Prisma Decimal
    remarks: string | null;
    sparePart: { id: string; kimap: string; name: string; unit: string };
  }[];
}

export interface PreventiveRow {
  id: string;
  executionDate: Date | null;
  result: string | null;
  status: string;
  findings: string | null;
  actionTaken: string | null;
  vendorPersonnel: string | null;
  remarks: string | null;
  workOrderNumber: string | null;
  createdAt: Date;
  pmPeriod: {
    periodNumber: number;
    plannedDate: Date;
    pmProgram: { id: string; name: string; vendor: { name: string } | null };
  };
  checklistResults: { result: string }[];
}

export function toDateOnly(value: Date): string {
  return value.toISOString().slice(0, 10);
}

/** Decimal Prisma / string / number -> number (null/undefined -> null). */
export function toNumber(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

export function buildCorrectiveEvent(row: CorrectiveRow): HistoryEvent {
  const consumed = row.status === 'COMPLETED';
  return {
    id: row.id,
    kind: 'CORRECTIVE',
    date: toDateOnly(row.maintenanceDate),
    status: row.status,
    title: row.problemDescription,
    remarks: row.remarks,
    materials: row.materials.map((m) => ({
      sparePartId: m.sparePart.id,
      kimap: m.sparePart.kimap,
      name: m.sparePart.name,
      unit: m.sparePart.unit,
      quantity: toNumber(m.quantity) ?? 0,
      remarks: m.remarks,
      consumed,
    })),
    corrective: {
      spkNumber: row.spkNumber,
      failureCategory: row.failureCategory,
      failureMode: row.failureMode ?? null,
      priority: row.priority,
      problemDescription: row.problemDescription,
      rootCause: row.rootCause,
      actionTaken: row.actionTaken,
      downtimeHours: toNumber(row.downtimeHours),
      technician: row.technician.fullName,
      additionalTechnicians: row.additionalTechnicians.map((t) => t.user.fullName),
      completionDate: row.completionDate ? toDateOnly(row.completionDate) : null,
      workOrderNumber: row.workOrderNumber,
      notificationNumber: row.notificationNumber,
    },
    preventive: null,
    createdAt: row.createdAt.toISOString(),
  };
}

export function buildPreventiveEvent(row: PreventiveRow): HistoryEvent {
  // PM yang sudah COMPLETED selalu punya executionDate di alur normal; fallback ke planned date
  // supaya data yang tidak konsisten tetap muncul di timeline (bukan hilang diam-diam).
  const date = toDateOnly(row.executionDate ?? row.pmPeriod.plannedDate);
  const { pmProgram, periodNumber } = row.pmPeriod;
  return {
    id: row.id,
    kind: 'PREVENTIVE',
    date,
    status: row.status,
    title: `${pmProgram.name} — Periode ${periodNumber}`,
    remarks: row.remarks,
    materials: [], // PM belum mencatat pemakaian material
    corrective: null,
    preventive: {
      programId: pmProgram.id,
      programName: pmProgram.name,
      periodNumber,
      plannedDate: toDateOnly(row.pmPeriod.plannedDate),
      vendorName: pmProgram.vendor?.name ?? null,
      result: row.result,
      findings: row.findings,
      actionTaken: row.actionTaken,
      vendorPersonnel: row.vendorPersonnel,
      workOrderNumber: row.workOrderNumber,
      checklistTotal: row.checklistResults.length,
      checklistNotOk: row.checklistResults.filter((c) => c.result === 'NOT_OK').length,
    },
    createdAt: row.createdAt.toISOString(),
  };
}

/** Terbaru dulu; tanggal sama -> yang dibuat belakangan di atas; terakhir id (deterministik). */
export function sortEventsDesc(events: HistoryEvent[]): HistoryEvent[] {
  return [...events].sort((a, b) => {
    if (a.date !== b.date) return a.date < b.date ? 1 : -1;
    if (a.createdAt !== b.createdAt) return a.createdAt < b.createdAt ? 1 : -1;
    return a.id < b.id ? 1 : -1;
  });
}

/** Filter inklusif pada tanggal kegiatan (yyyy-mm-dd, perbandingan string aman untuk format ISO). */
export function filterByDateRange(events: HistoryEvent[], dateFrom?: string, dateTo?: string): HistoryEvent[] {
  return events.filter((e) => (!dateFrom || e.date >= dateFrom) && (!dateTo || e.date <= dateTo));
}

export function buildSummary(events: HistoryEvent[]): HistorySummary {
  let correctiveCount = 0;
  let preventiveCount = 0;
  let openCorrectiveCount = 0;
  let totalDowntimeHours = 0;
  let lastActivityDate: string | null = null;
  const usage = new Map<string, MaterialUsageSummary>();

  for (const e of events) {
    if (lastActivityDate === null || e.date > lastActivityDate) lastActivityDate = e.date;

    if (e.kind === 'PREVENTIVE') {
      preventiveCount += 1;
      continue;
    }

    correctiveCount += 1;
    if (e.status !== 'COMPLETED' && e.status !== 'CANCELLED') openCorrectiveCount += 1;
    // Tiket yang dibatalkan tidak dihitung ke downtime (tidak ada pekerjaan yang terjadi).
    if (e.status !== 'CANCELLED') totalDowntimeHours += e.corrective?.downtimeHours ?? 0;

    for (const m of e.materials) {
      if (!m.consumed) continue;
      const cur = usage.get(m.sparePartId);
      if (cur) {
        cur.totalQuantity += m.quantity;
        cur.usageCount += 1;
      } else {
        usage.set(m.sparePartId, {
          sparePartId: m.sparePartId,
          kimap: m.kimap,
          name: m.name,
          unit: m.unit,
          totalQuantity: m.quantity,
          usageCount: 1,
        });
      }
    }
  }

  return {
    totalEvents: events.length,
    correctiveCount,
    preventiveCount,
    openCorrectiveCount,
    // Dibulatkan 2 desimal (kolom downtime Decimal(6,2)) — hindari artefak floating point 0.1+0.2.
    totalDowntimeHours: Math.round(totalDowntimeHours * 100) / 100,
    lastActivityDate,
    materialUsage: [...usage.values()]
      .map((u) => ({ ...u, totalQuantity: Math.round(u.totalQuantity * 100) / 100 }))
      .sort((a, b) => b.totalQuantity - a.totalQuantity || a.kimap.localeCompare(b.kimap)),
  };
}
