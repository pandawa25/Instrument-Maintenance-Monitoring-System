import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { PmProgramsService } from './pm-programs.service';

const DETAIL_ROW = {
  id: 'pm-1',
  name: 'PM Pressure Transmitter',
  vendor: null,
  equipment: [],
  checklistItems: [],
  _count: { periods: 0 },
};

// repository + 3 service dependency (vendor/equipment/activityType) di-mock —
// test fokus ke validateReferences() dan guard remove() (replace-all transaction
// pattern-nya sendiri ada di repository, bukan di sini).
function buildService(opts: {
  periodCount?: number;
  vendorFindOne?: () => Promise<any>;
  equipmentFindOne?: () => Promise<any>;
  activityTypeFindOne?: () => Promise<any>;
}) {
  const repository = {
    findMany: jest.fn(),
    findById: jest.fn().mockResolvedValue(DETAIL_ROW),
    create: jest.fn().mockResolvedValue(DETAIL_ROW),
    update: jest.fn().mockResolvedValue(DETAIL_ROW),
    countPeriods: jest.fn().mockResolvedValue(opts.periodCount ?? 0),
    softDelete: jest.fn().mockResolvedValue(undefined),
  };

  const vendorsService = { findOne: opts.vendorFindOne ?? jest.fn().mockResolvedValue({ id: 'vendor-1' }) };
  const equipmentService = { findOne: opts.equipmentFindOne ?? jest.fn().mockResolvedValue({ id: 'eq-1' }) };
  const activityTypesService = {
    findOne: opts.activityTypeFindOne ?? jest.fn().mockResolvedValue({ id: 'act-1' }),
  };

  const service = new PmProgramsService(
    repository as any,
    vendorsService as any,
    equipmentService as any,
    activityTypesService as any,
  );
  return { service, repository, vendorsService, equipmentService, activityTypesService };
}

const BASE_DTO = {
  name: 'PM Pressure Transmitter',
  vendorId: 'vendor-1',
  equipmentIds: ['eq-1', 'eq-2'],
  checklistItems: [{ activityTypeId: 'act-1', description: 'Cek kalibrasi' }],
} as any;

describe('PmProgramsService.create', () => {
  it('membuat PM Program kalau semua referensi (vendor/equipment/activityType) valid', async () => {
    const { service, repository } = buildService({});

    await service.create(BASE_DTO);

    expect(repository.create).toHaveBeenCalledWith(BASE_DTO);
  });

  it('menolak (BadRequestException) kalau vendorId tidak ditemukan', async () => {
    const { service } = buildService({ vendorFindOne: jest.fn().mockRejectedValue(new NotFoundException()) });

    await expect(service.create(BASE_DTO)).rejects.toThrow(BadRequestException);
  });

  it('menolak (BadRequestException) kalau salah satu equipmentId tidak ditemukan', async () => {
    const { service } = buildService({ equipmentFindOne: jest.fn().mockRejectedValue(new NotFoundException()) });

    await expect(service.create(BASE_DTO)).rejects.toThrow(BadRequestException);
  });

  it('menolak (BadRequestException) kalau activityTypeId checklist item tidak ditemukan', async () => {
    const { service } = buildService({
      activityTypeFindOne: jest.fn().mockRejectedValue(new NotFoundException()),
    });

    await expect(service.create(BASE_DTO)).rejects.toThrow(BadRequestException);
  });

  it('tidak validasi vendor kalau vendorId tidak dikirim (opsional)', async () => {
    const { service, vendorsService } = buildService({});
    const dto = { ...BASE_DTO, vendorId: undefined };

    await service.create(dto);

    expect(vendorsService.findOne).not.toHaveBeenCalled();
  });
});

describe('PmProgramsService.update', () => {
  it('melempar NotFoundException kalau PM Program tidak ada', async () => {
    const { service, repository } = buildService({});
    repository.findById.mockResolvedValueOnce(null);

    await expect(service.update('pm-missing', BASE_DTO)).rejects.toThrow(NotFoundException);
  });

  it('memvalidasi ulang referensi baru sebelum update (replace-all)', async () => {
    const { service, equipmentService } = buildService({
      equipmentFindOne: jest.fn().mockRejectedValue(new NotFoundException()),
    });

    await expect(service.update('pm-1', BASE_DTO)).rejects.toThrow(BadRequestException);
    expect(equipmentService.findOne).toHaveBeenCalled();
  });
});

describe('PmProgramsService.remove', () => {
  it('menghapus (soft delete) kalau belum ada periode', async () => {
    const { service, repository } = buildService({ periodCount: 0 });

    const result = await service.remove('pm-1');

    expect(repository.softDelete).toHaveBeenCalledWith('pm-1');
    expect(result).toEqual({ id: 'pm-1', deleted: true });
  });

  it('menolak (ConflictException) kalau masih punya periode — sarankan nonaktifkan, bukan hapus', async () => {
    const { service, repository } = buildService({ periodCount: 5 });

    await expect(service.remove('pm-1')).rejects.toThrow(ConflictException);
    expect(repository.softDelete).not.toHaveBeenCalled();
  });
});
