import {
  buildCorrectiveEvent,
  buildPreventiveEvent,
  buildSummary,
  filterByDateRange,
  sortEventsDesc,
  type CorrectiveRow,
  type PreventiveRow,
} from './history-timeline.util';

const part = (id: string, kimap: string, name = `Part ${kimap}`, unit = 'pcs') => ({ id, kimap, name, unit });

function cm(overrides: Partial<CorrectiveRow> = {}): CorrectiveRow {
  return {
    id: 'cm-1',
    spkNumber: 'SPK-1',
    maintenanceDate: new Date('2026-09-10T00:00:00.000Z'),
    completionDate: null,
    failureCategory: 'INSTRUMENT',
    priority: 'MEDIUM',
    status: 'COMPLETED',
    problemDescription: 'Pembacaan drift',
    rootCause: null,
    actionTaken: null,
    downtimeHours: '2.50',
    remarks: null,
    workOrderNumber: null,
    notificationNumber: null,
    createdAt: new Date('2026-09-10T08:00:00.000Z'),
    technician: { fullName: 'Budi' },
    additionalTechnicians: [{ user: { fullName: 'Sari' } }],
    materials: [],
    ...overrides,
  };
}

function pm(overrides: Partial<PreventiveRow> = {}): PreventiveRow {
  return {
    id: 'pm-1',
    executionDate: new Date('2026-08-01T00:00:00.000Z'),
    result: 'OK',
    status: 'COMPLETED',
    findings: null,
    actionTaken: null,
    vendorPersonnel: 'Andi',
    remarks: null,
    workOrderNumber: null,
    createdAt: new Date('2026-08-01T08:00:00.000Z'),
    pmPeriod: {
      periodNumber: 3,
      plannedDate: new Date('2026-07-30T00:00:00.000Z'),
      pmProgram: { id: 'prog-1', name: 'PM Kalibrasi Tahunan', vendor: { name: 'PT Vendor' } },
    },
    checklistResults: [{ result: 'OK' }, { result: 'NOT_OK' }, { result: 'NA' }],
    ...overrides,
  };
}

describe('buildCorrectiveEvent', () => {
  it('memetakan field, downtime Decimal-string -> number, dan technician tambahan', () => {
    const e = buildCorrectiveEvent(cm());
    expect(e.kind).toBe('CORRECTIVE');
    expect(e.date).toBe('2026-09-10');
    expect(e.corrective?.downtimeHours).toBe(2.5);
    expect(e.corrective?.technician).toBe('Budi');
    expect(e.corrective?.additionalTechnicians).toEqual(['Sari']);
    expect(e.preventive).toBeNull();
  });

  it('material consumed hanya kalau CM COMPLETED', () => {
    const materials = [{ quantity: '2', remarks: null, sparePart: part('p1', 'K-1') }];
    expect(buildCorrectiveEvent(cm({ status: 'COMPLETED', materials })).materials[0].consumed).toBe(true);
    expect(buildCorrectiveEvent(cm({ status: 'WAITING_MATERIAL', materials })).materials[0].consumed).toBe(false);
    expect(buildCorrectiveEvent(cm({ status: 'CANCELLED', materials })).materials[0].consumed).toBe(false);
  });

  it('downtime kosong -> null', () => {
    expect(buildCorrectiveEvent(cm({ downtimeHours: null })).corrective?.downtimeHours).toBeNull();
  });
});

describe('buildPreventiveEvent', () => {
  it('judul = program + periode, hitung checklist NOT_OK, tanpa material', () => {
    const e = buildPreventiveEvent(pm());
    expect(e.kind).toBe('PREVENTIVE');
    expect(e.title).toBe('PM Kalibrasi Tahunan — Periode 3');
    expect(e.date).toBe('2026-08-01');
    expect(e.materials).toEqual([]);
    expect(e.preventive).toMatchObject({ checklistTotal: 3, checklistNotOk: 1, vendorName: 'PT Vendor', programId: 'prog-1' });
  });

  it('executionDate kosong -> fallback ke plannedDate', () => {
    expect(buildPreventiveEvent(pm({ executionDate: null })).date).toBe('2026-07-30');
  });
});

describe('sortEventsDesc', () => {
  it('terbaru dulu; tanggal sama -> createdAt lebih baru di atas', () => {
    const a = buildCorrectiveEvent(cm({ id: 'a', maintenanceDate: new Date('2026-09-01T00:00:00Z') }));
    const b = buildCorrectiveEvent(
      cm({ id: 'b', maintenanceDate: new Date('2026-09-05T00:00:00Z'), createdAt: new Date('2026-09-05T01:00:00Z') }),
    );
    const c = buildCorrectiveEvent(
      cm({ id: 'c', maintenanceDate: new Date('2026-09-05T00:00:00Z'), createdAt: new Date('2026-09-05T09:00:00Z') }),
    );
    expect(sortEventsDesc([a, b, c]).map((e) => e.id)).toEqual(['c', 'b', 'a']);
  });

  it('tidak memutasi array input', () => {
    const list = [buildCorrectiveEvent(cm({ id: 'x' }))];
    const sorted = sortEventsDesc(list);
    expect(sorted).not.toBe(list);
  });
});

describe('filterByDateRange', () => {
  const events = [
    buildPreventiveEvent(pm({ id: 'p1', executionDate: new Date('2026-08-01T00:00:00Z') })),
    buildPreventiveEvent(pm({ id: 'p2', executionDate: new Date('2026-09-01T00:00:00Z') })),
    buildPreventiveEvent(pm({ id: 'p3', executionDate: new Date('2026-10-01T00:00:00Z') })),
  ];

  it('inklusif di kedua ujung', () => {
    expect(filterByDateRange(events, '2026-08-01', '2026-09-01').map((e) => e.id)).toEqual(['p1', 'p2']);
  });
  it('tanpa batas -> semua', () => {
    expect(filterByDateRange(events)).toHaveLength(3);
  });
  it('hanya dateFrom / hanya dateTo', () => {
    expect(filterByDateRange(events, '2026-09-01').map((e) => e.id)).toEqual(['p2', 'p3']);
    expect(filterByDateRange(events, undefined, '2026-08-31').map((e) => e.id)).toEqual(['p1']);
  });
});

describe('buildSummary', () => {
  it('hitung CM/PM, open, downtime (CANCELLED tidak dihitung), tanggal terakhir', () => {
    const events = [
      buildCorrectiveEvent(cm({ id: '1', status: 'COMPLETED', downtimeHours: '1.10' })),
      buildCorrectiveEvent(cm({ id: '2', status: 'IN_PROGRESS', downtimeHours: '0.20', maintenanceDate: new Date('2026-09-20T00:00:00Z') })),
      buildCorrectiveEvent(cm({ id: '3', status: 'CANCELLED', downtimeHours: '50' })),
      buildPreventiveEvent(pm()),
    ];
    const s = buildSummary(events);
    expect(s).toMatchObject({
      totalEvents: 4,
      correctiveCount: 3,
      preventiveCount: 1,
      openCorrectiveCount: 1,
      totalDowntimeHours: 1.3, // 1.10 + 0.20 tanpa artefak floating point
      lastActivityDate: '2026-09-20',
    });
  });

  it('rekap material: hanya dari CM COMPLETED, dijumlah per part, urut qty terbesar', () => {
    const events = [
      buildCorrectiveEvent(
        cm({
          id: '1',
          status: 'COMPLETED',
          materials: [
            { quantity: '2', remarks: null, sparePart: part('p1', 'K-1') },
            { quantity: '5', remarks: null, sparePart: part('p2', 'K-2') },
          ],
        }),
      ),
      buildCorrectiveEvent(
        cm({ id: '2', status: 'COMPLETED', materials: [{ quantity: '1.5', remarks: null, sparePart: part('p1', 'K-1') }] }),
      ),
      // belum selesai -> kebutuhan saja, tidak masuk rekap pemakaian
      buildCorrectiveEvent(
        cm({ id: '3', status: 'WAITING_MATERIAL', materials: [{ quantity: '99', remarks: null, sparePart: part('p3', 'K-3') }] }),
      ),
    ];
    expect(buildSummary(events).materialUsage).toEqual([
      { sparePartId: 'p2', kimap: 'K-2', name: 'Part K-2', unit: 'pcs', totalQuantity: 5, usageCount: 1 },
      { sparePartId: 'p1', kimap: 'K-1', name: 'Part K-1', unit: 'pcs', totalQuantity: 3.5, usageCount: 2 },
    ]);
  });

  it('kosong -> semua nol, lastActivityDate null', () => {
    expect(buildSummary([])).toEqual({
      totalEvents: 0,
      correctiveCount: 0,
      preventiveCount: 0,
      openCorrectiveCount: 0,
      totalDowntimeHours: 0,
      lastActivityDate: null,
      materialUsage: [],
    });
  });
});
