import { BadRequestException, ForbiddenException } from '@nestjs/common';
import * as fs from 'fs';
import { AttachmentsService } from './attachments.service';

jest.mock('fs', () => ({ ...jest.requireActual('fs'), unlink: jest.fn((_p: string, cb: () => void) => cb()) }));

const admin = { id: 'u-admin', role: 'Admin', roleId: 'r-admin' } as never;
const teknisi = { id: 'u-tek', role: 'Teknisi', roleId: 'r-tek' } as never;
const file = { path: '/tmp/uploads/2026/10/x.pdf', originalname: 'datasheet.pdf', mimetype: 'application/pdf', size: 100 } as Express.Multer.File;
const row = (entityType: string) => ({ id: 'a1', entityType, entityId: 'e1', fileName: 'f', storedPath: 'p', mimeType: 'image/png', fileSize: 1, uploadedBy: { id: 'u', fullName: 'U' }, createdAt: new Date() });

describe('AttachmentsService — hak akses per jenis entity', () => {
  const repo = { create: jest.fn(), findMany: jest.fn(), findById: jest.fn(), countByEntity: jest.fn(), softDelete: jest.fn() };
  const maintenance = { findOne: jest.fn() };
  const pm = { findOne: jest.fn() };
  const equipment = { findOne: jest.fn() };
  const permissions = { hasPermission: jest.fn() };
  let service: AttachmentsService;

  beforeEach(() => {
    jest.clearAllMocks();
    repo.countByEntity.mockResolvedValue(0);
    repo.create.mockImplementation((p) => Promise.resolve({ ...row(p.entityType), ...p, uploadedBy: { id: 'u', fullName: 'U' }, createdAt: new Date() }));
    service = new AttachmentsService(repo as never, maintenance as never, pm as never, equipment as never, permissions as never);
  });

  it('EQUIPMENT: user dengan hak EQUIPMENT edit boleh upload (bukan Admin)', async () => {
    permissions.hasPermission.mockResolvedValue(true);
    const res = await service.create(teknisi, 'EQUIPMENT', 'e1', file);
    expect(permissions.hasPermission).toHaveBeenCalledWith(teknisi, 'EQUIPMENT', 'edit');
    expect(equipment.findOne).toHaveBeenCalledWith('e1');
    expect(res.entityType).toBe('EQUIPMENT');
    expect(fs.unlink).not.toHaveBeenCalled();
  });

  it('EQUIPMENT: tanpa hak edit -> 403 dan file yang sudah ditulis multer dibuang', async () => {
    permissions.hasPermission.mockResolvedValue(false);
    await expect(service.create(teknisi, 'EQUIPMENT', 'e1', file)).rejects.toThrow(ForbiddenException);
    expect(fs.unlink).toHaveBeenCalledWith(file.path, expect.any(Function));
    expect(repo.create).not.toHaveBeenCalled();
  });

  it('EQUIPMENT: batas 20 file per equipment', async () => {
    permissions.hasPermission.mockResolvedValue(true);
    repo.countByEntity.mockResolvedValue(20);
    await expect(service.create(admin, 'EQUIPMENT', 'e1', file)).rejects.toThrow(/Maksimal 20/);
    expect(fs.unlink).toHaveBeenCalled();
  });

  it('equipment tidak ditemukan -> 400 dan file dibuang', async () => {
    permissions.hasPermission.mockResolvedValue(true);
    equipment.findOne.mockRejectedValue(new Error('nf'));
    await expect(service.create(admin, 'EQUIPMENT', 'e1', file)).rejects.toThrow(BadRequestException);
    expect(fs.unlink).toHaveBeenCalled();
  });

  it('evidence CM tetap Admin only (perilaku lama): Teknisi ditolak, permission matriks tidak dipakai', async () => {
    await expect(service.create(teknisi, 'CORRECTIVE_MAINTENANCE', 'c1', file)).rejects.toThrow(ForbiddenException);
    expect(permissions.hasPermission).not.toHaveBeenCalled();
    await expect(service.create(admin, 'CORRECTIVE_MAINTENANCE', 'c1', file)).resolves.toBeDefined();
    expect(maintenance.findOne).toHaveBeenCalledWith('c1');
  });

  it('evidence CM: list/unduh tetap terbuka untuk semua user login', async () => {
    repo.findMany.mockResolvedValue([]);
    await expect(service.findAllForEntity(teknisi, 'CORRECTIVE_MAINTENANCE', 'c1')).resolves.toEqual([]);
    expect(permissions.hasPermission).not.toHaveBeenCalled();
  });

  it('EQUIPMENT: list butuh hak EQUIPMENT view', async () => {
    permissions.hasPermission.mockResolvedValue(false);
    await expect(service.findAllForEntity(teknisi, 'EQUIPMENT', 'e1')).rejects.toThrow(ForbiddenException);
    expect(permissions.hasPermission).toHaveBeenCalledWith(teknisi, 'EQUIPMENT', 'view');
  });

  it('hapus & unduh memakai entityType milik lampiran (bukan input user)', async () => {
    repo.findById.mockResolvedValue(row('EQUIPMENT'));
    permissions.hasPermission.mockResolvedValue(false);
    await expect(service.remove(teknisi, 'a1')).rejects.toThrow(ForbiddenException);
    expect(permissions.hasPermission).toHaveBeenLastCalledWith(teknisi, 'EQUIPMENT', 'edit');
    await expect(service.getFileForDownload(teknisi, 'a1')).rejects.toThrow(ForbiddenException);
    expect(permissions.hasPermission).toHaveBeenLastCalledWith(teknisi, 'EQUIPMENT', 'view');
    expect(repo.softDelete).not.toHaveBeenCalled();

    permissions.hasPermission.mockResolvedValue(true);
    await expect(service.remove(teknisi, 'a1')).resolves.toEqual({ id: 'a1', deleted: true });
  });
});
