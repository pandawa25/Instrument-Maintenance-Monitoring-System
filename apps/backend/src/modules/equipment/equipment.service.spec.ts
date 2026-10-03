import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { EquipmentService } from './equipment.service';

// Semua dependency (repository, AreasService, InstrumentNamesService) di-mock —
// test fokus ke logika service (validasi tag_number, referensi, guard delete),
// bukan Prisma.
function buildService(opts: {
  existingByTag?: any | null;
  findByIdResult?: any;
  countMaintenance?: number;
  areaFindOne?: () => Promise<any>;
  instrumentNameFindOne?: () => Promise<any>;
}) {
  const repository = {
    findMany: jest.fn(),
    findById: jest.fn().mockResolvedValue(
      opts.findByIdResult ?? {
        id: 'eq-1',
        tagNumber: 'PT-001',
        area: { id: 'area-1', areaCode: 'A1', areaName: 'Area 1' },
        instrumentName: { id: 'in-1', code: 'PT', name: 'Pressure Transmitter' },
        maintenance: [],
      },
    ),
    findAllForDropdown: jest.fn(),
    findByTagNumber: jest.fn().mockResolvedValue(opts.existingByTag ?? null),
    create: jest.fn().mockResolvedValue({ id: 'eq-new' }),
    update: jest.fn().mockResolvedValue(undefined),
    countMaintenance: jest.fn().mockResolvedValue(opts.countMaintenance ?? 0),
    softDelete: jest.fn().mockResolvedValue(undefined),
  };

  const areasService = {
    findOne: opts.areaFindOne ?? jest.fn().mockResolvedValue({ id: 'area-1' }),
  };
  const instrumentNamesService = {
    findOne: opts.instrumentNameFindOne ?? jest.fn().mockResolvedValue({ id: 'in-1' }),
  };

  const service = new EquipmentService(repository as any, areasService as any, instrumentNamesService as any);
  return { service, repository, areasService, instrumentNamesService };
}

const CREATE_DTO = {
  tagNumber: '  pt-001  ',
  areaId: 'area-1',
  instrumentNameId: 'in-1',
} as any;

describe('EquipmentService.create', () => {
  it('menormalisasi tag_number (trim + uppercase) sebelum cek duplikat & simpan', async () => {
    const { service, repository } = buildService({});

    await service.create(CREATE_DTO);

    expect(repository.findByTagNumber).toHaveBeenCalledWith('PT-001');
    expect(repository.create).toHaveBeenCalledWith(expect.objectContaining({ tagNumber: 'PT-001' }));
  });

  it('menolak (ConflictException) kalau tag_number sudah dipakai equipment lain', async () => {
    const { service } = buildService({ existingByTag: { id: 'eq-other' } });

    await expect(service.create(CREATE_DTO)).rejects.toThrow(ConflictException);
  });

  it('menolak (BadRequestException) kalau areaId tidak ditemukan', async () => {
    const { service } = buildService({
      areaFindOne: jest.fn().mockRejectedValue(new NotFoundException()),
    });

    await expect(service.create(CREATE_DTO)).rejects.toThrow(BadRequestException);
  });

  it('menolak (BadRequestException) kalau instrumentNameId tidak ditemukan', async () => {
    const { service } = buildService({
      instrumentNameFindOne: jest.fn().mockRejectedValue(new NotFoundException()),
    });

    await expect(service.create(CREATE_DTO)).rejects.toThrow(BadRequestException);
  });
});

describe('EquipmentService.update', () => {
  it('mengizinkan update tag_number ke dirinya sendiri (existing.id === id)', async () => {
    const { service, repository } = buildService({ existingByTag: { id: 'eq-1' } });

    await expect(service.update('eq-1', { tagNumber: 'PT-001' } as any)).resolves.toBeDefined();
    expect(repository.update).toHaveBeenCalled();
  });

  it('menolak (ConflictException) kalau tag_number baru dipakai equipment LAIN', async () => {
    const { service } = buildService({ existingByTag: { id: 'eq-other' } });

    await expect(service.update('eq-1', { tagNumber: 'PT-999' } as any)).rejects.toThrow(ConflictException);
  });

  it('melempar NotFoundException kalau equipment yang diupdate tidak ada', async () => {
    const { service, repository } = buildService({});
    repository.findById.mockResolvedValueOnce(null);

    await expect(service.update('eq-missing', {} as any)).rejects.toThrow(NotFoundException);
  });
});

describe('EquipmentService.remove', () => {
  it('menghapus (soft delete) kalau tidak ada riwayat maintenance', async () => {
    const { service, repository } = buildService({ countMaintenance: 0 });

    const result = await service.remove('eq-1');

    expect(repository.softDelete).toHaveBeenCalledWith('eq-1');
    expect(result).toEqual({ id: 'eq-1', deleted: true });
  });

  it('menolak (ConflictException) kalau masih punya riwayat corrective maintenance', async () => {
    const { service, repository } = buildService({ countMaintenance: 3 });

    await expect(service.remove('eq-1')).rejects.toThrow(ConflictException);
    expect(repository.softDelete).not.toHaveBeenCalled();
  });
});
