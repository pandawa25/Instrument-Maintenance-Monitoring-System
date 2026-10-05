import { MaintenanceRepository } from './maintenance.repository';

const CM_ID = 'cm-1';
const ACTOR = 'user-1';
const COMPLETION = new Date('2026-10-02T00:00:00.000Z');

const OLD_MATERIALS = [{ sparePartId: 'sp-1', quantity: 2 }];
const NEW_MATERIALS = [
  { sparePartId: 'sp-1', quantity: 3 },
  { sparePartId: 'sp-2', quantity: 1.5 },
];

interface TxOptions {
  updatedRow?: { status: string; completionDate: Date | null };
  existingMaterials?: unknown[];
}

function build({ updatedRow = { status: 'OPEN', completionDate: null }, existingMaterials = OLD_MATERIALS }: TxOptions = {}) {
  const tx = {
    correctiveMaintenance: {
      create: jest.fn().mockResolvedValue({ id: CM_ID, completionDate: updatedRow.completionDate }),
      update: jest.fn().mockResolvedValue(updatedRow),
      findUnique: jest.fn().mockResolvedValue(updatedRow),
      findFirst: jest.fn().mockResolvedValue({ id: CM_ID }),
    },
    correctiveMaintenanceMaterial: {
      findMany: jest.fn().mockResolvedValue(existingMaterials),
      deleteMany: jest.fn().mockResolvedValue(undefined),
      createMany: jest.fn().mockResolvedValue(undefined),
    },
    correctiveMaintenanceTechnician: { deleteMany: jest.fn(), createMany: jest.fn() },
  };
  const prisma = { $transaction: jest.fn(async (fn: (t: typeof tx) => unknown) => fn(tx)) };
  const sparePartsRepository = { recordMovement: jest.fn().mockResolvedValue(undefined) };
  const repository = new MaintenanceRepository(prisma as any, sparePartsRepository as any);
  return { repository, tx, sparePartsRepository };
}

function movementsOf(sparePartsRepository: { recordMovement: jest.Mock }) {
  return sparePartsRepository.recordMovement.mock.calls.map(([, p]) => ({
    type: p.type,
    sparePartId: p.sparePartId,
    delta: Number(p.quantityDelta),
    movementDate: p.movementDate,
  }));
}

const baseCreateDto = {
  maintenanceDate: '2026-10-01',
  equipmentId: 'eq-1',
  technicianId: 't-1',
  failureCategory: 'INSTRUMENT',
  problemDescription: 'x',
  spkNumber: 'SPK-1',
} as any;

describe('MaintenanceRepository.create — stock hanya dipotong saat Completed', () => {
  it('status OPEN dengan material: TIDAK memotong stock', async () => {
    const { repository, sparePartsRepository } = build();

    await repository.create({ ...baseCreateDto, status: 'OPEN', materials: NEW_MATERIALS }, 'area-1', ACTOR);

    expect(sparePartsRepository.recordMovement).not.toHaveBeenCalled();
  });

  it('tanpa status (default OPEN) dengan material: TIDAK memotong stock', async () => {
    const { repository, sparePartsRepository } = build();

    await repository.create({ ...baseCreateDto, materials: NEW_MATERIALS }, 'area-1', ACTOR);

    expect(sparePartsRepository.recordMovement).not.toHaveBeenCalled();
  });

  it('langsung COMPLETED: memotong stock memakai tanggal selesai sebagai tanggal transaksi', async () => {
    const { repository, sparePartsRepository } = build({ updatedRow: { status: 'COMPLETED', completionDate: COMPLETION } });

    await repository.create(
      { ...baseCreateDto, status: 'COMPLETED', completionDate: '2026-10-02', materials: NEW_MATERIALS },
      'area-1',
      ACTOR,
    );

    expect(movementsOf(sparePartsRepository)).toEqual([
      { type: 'MAINTENANCE_USAGE', sparePartId: 'sp-1', delta: -3, movementDate: COMPLETION },
      { type: 'MAINTENANCE_USAGE', sparePartId: 'sp-2', delta: -1.5, movementDate: COMPLETION },
    ]);
  });
});

describe('MaintenanceRepository.update — transisi stock', () => {
  it('OPEN -> COMPLETED tanpa mengirim materials: memotong stock sesuai material yang sudah tersimpan', async () => {
    const { repository, sparePartsRepository } = build({ updatedRow: { status: 'COMPLETED', completionDate: COMPLETION } });

    await repository.update(CM_ID, { status: 'COMPLETED', completionDate: '2026-10-02' } as any, ACTOR, 'OPEN');

    expect(movementsOf(sparePartsRepository)).toEqual([
      { type: 'MAINTENANCE_USAGE', sparePartId: 'sp-1', delta: -2, movementDate: COMPLETION },
    ]);
  });

  it('OPEN -> COMPLETED sambil mengganti materials: hanya daftar BARU yang dipotong (tanpa restore)', async () => {
    const { repository, sparePartsRepository } = build({ updatedRow: { status: 'COMPLETED', completionDate: COMPLETION } });

    await repository.update(
      CM_ID,
      { status: 'COMPLETED', completionDate: '2026-10-02', materials: NEW_MATERIALS } as any,
      ACTOR,
      'IN_PROGRESS',
    );

    const types = movementsOf(sparePartsRepository).map((m) => m.type);
    expect(types).toEqual(['MAINTENANCE_USAGE', 'MAINTENANCE_USAGE']);
  });

  it('edit material saat masih OPEN: tidak ada pergerakan stock sama sekali', async () => {
    const { repository, tx, sparePartsRepository } = build({ updatedRow: { status: 'OPEN', completionDate: null } });

    await repository.update(CM_ID, { materials: NEW_MATERIALS } as any, ACTOR, 'OPEN');

    expect(tx.correctiveMaintenanceMaterial.createMany).toHaveBeenCalled(); // daftar kebutuhan tetap tersimpan
    expect(sparePartsRepository.recordMovement).not.toHaveBeenCalled();
  });

  it('IN_PROGRESS -> CANCELLED: tidak ada restore karena stock tidak pernah terpotong', async () => {
    const { repository, sparePartsRepository } = build({ updatedRow: { status: 'CANCELLED', completionDate: null } });

    await repository.update(CM_ID, { status: 'CANCELLED' } as any, ACTOR, 'IN_PROGRESS');

    expect(sparePartsRepository.recordMovement).not.toHaveBeenCalled();
  });

  it('edit material pada CM yang SUDAH Completed: restore daftar lama lalu potong daftar baru', async () => {
    const { repository, sparePartsRepository } = build({ updatedRow: { status: 'COMPLETED', completionDate: COMPLETION } });

    await repository.update(CM_ID, { materials: NEW_MATERIALS } as any, ACTOR, 'COMPLETED');

    expect(movementsOf(sparePartsRepository)).toEqual([
      { type: 'MAINTENANCE_RETURN', sparePartId: 'sp-1', delta: 2, movementDate: COMPLETION },
      { type: 'MAINTENANCE_USAGE', sparePartId: 'sp-1', delta: -3, movementDate: COMPLETION },
      { type: 'MAINTENANCE_USAGE', sparePartId: 'sp-2', delta: -1.5, movementDate: COMPLETION },
    ]);
  });

  it('edit field lain pada CM Completed (tanpa materials): stock tidak disentuh', async () => {
    const { repository, sparePartsRepository } = build({ updatedRow: { status: 'COMPLETED', completionDate: COMPLETION } });

    await repository.update(CM_ID, { remarks: 'catatan' } as any, ACTOR, 'COMPLETED');

    expect(sparePartsRepository.recordMovement).not.toHaveBeenCalled();
  });
});

describe('MaintenanceRepository.softDelete', () => {
  it('menghapus CM Completed: stock dikembalikan dengan tanggal selesai', async () => {
    const { repository, sparePartsRepository } = build({ updatedRow: { status: 'COMPLETED', completionDate: COMPLETION } });

    await repository.softDelete(CM_ID, ACTOR);

    expect(movementsOf(sparePartsRepository)).toEqual([
      { type: 'MAINTENANCE_RETURN', sparePartId: 'sp-1', delta: 2, movementDate: COMPLETION },
    ]);
  });

  it.each(['OPEN', 'IN_PROGRESS', 'WAITING_MATERIAL', 'CANCELLED'])(
    'menghapus CM berstatus %s: stock tidak disentuh',
    async (status) => {
      const { repository, sparePartsRepository } = build({ updatedRow: { status, completionDate: null } });

      await repository.softDelete(CM_ID, ACTOR);

      expect(sparePartsRepository.recordMovement).not.toHaveBeenCalled();
    },
  );
});
