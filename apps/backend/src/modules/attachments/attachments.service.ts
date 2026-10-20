import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Attachment, AttachmentEntityType } from '@prisma/client';
import { createReadStream, existsSync, unlink } from 'fs';
import { join, relative } from 'path';
import { AttachmentsRepository } from './attachments.repository';
import { getUploadRoot, maxFilesFor } from './attachments.multer.config';
import { MaintenanceService } from '../maintenance/maintenance.service';
import { PmPeriodExecutionsService } from '../pm-periods/pm-period-executions.service';
import { EquipmentService } from '../equipment/equipment.service';
import { PermissionsService } from '../permissions/permissions.service';
import { AuthenticatedUser } from '../../common/decorators/current-user.decorator';

type AttachmentWithUploader = Attachment & { uploadedBy: { id: string; fullName: string } };

@Injectable()
export class AttachmentsService {
  constructor(
    private readonly repository: AttachmentsRepository,
    private readonly maintenanceService: MaintenanceService,
    private readonly pmPeriodExecutionsService: PmPeriodExecutionsService,
    private readonly equipmentService: EquipmentService,
    private readonly permissionsService: PermissionsService,
  ) {}

  /**
   * Hak akses lampiran per jenis entity:
   * - EQUIPMENT: mengikuti matriks permission modul Equipment (lihat = view, upload/hapus = edit).
   * - Jenis lain (evidence CM/PM): perilaku lama — lihat/unduh bagi semua user login, upload/hapus Admin only.
   */
  private async assertAccess(user: AuthenticatedUser, entityType: AttachmentEntityType, action: 'view' | 'write') {
    if (entityType === 'EQUIPMENT') {
      const allowed = await this.permissionsService.hasPermission(user, 'EQUIPMENT', action === 'view' ? 'view' : 'edit');
      if (!allowed) throw new ForbiddenException('Anda tidak memiliki akses untuk dokumen equipment ini');
      return;
    }
    if (action === 'write' && user.role !== 'Admin') {
      throw new ForbiddenException('Anda tidak memiliki akses untuk melakukan aksi ini');
    }
  }

  private toListItem(row: AttachmentWithUploader) {
    return {
      id: row.id,
      entityType: row.entityType,
      entityId: row.entityId,
      fileName: row.fileName,
      mimeType: row.mimeType,
      fileSize: row.fileSize,
      uploadedBy: row.uploadedBy,
      createdAt: row.createdAt,
      // Frontend cukup pakai path relatif ini + base URL API — tidak perlu tahu storedPath.
      url: `/attachments/${row.id}/file`,
    };
  }

  /**
   * Validasi entityId benar-benar ada & belum dihapus — pola yang sama dengan
   * validateMaterials/resolveAreaId di MaintenanceService.
   */
  private async validateEntity(entityType: AttachmentEntityType, entityId: string) {
    try {
      if (entityType === 'CORRECTIVE_MAINTENANCE') {
        await this.maintenanceService.findOne(entityId);
      } else if (entityType === 'PM_PERIOD_EXECUTION') {
        await this.pmPeriodExecutionsService.findOne(entityId);
      } else if (entityType === 'EQUIPMENT') {
        await this.equipmentService.findOne(entityId);
      }
    } catch {
      throw new BadRequestException(`Data ${entityType} dengan id '${entityId}' tidak ditemukan`);
    }
  }

  async findAllForEntity(user: AuthenticatedUser, entityType: AttachmentEntityType, entityId: string) {
    await this.assertAccess(user, entityType, 'view');
    await this.validateEntity(entityType, entityId);
    const rows = await this.repository.findMany(entityType, entityId);
    return rows.map((row) => this.toListItem(row));
  }

  async create(
    user: AuthenticatedUser,
    entityType: AttachmentEntityType,
    entityId: string,
    file: Express.Multer.File,
  ) {
    // Multer sudah menulis file ke disk SEBELUM method ini jalan — jadi setiap penolakan di bawah
    // wajib membuang file tersebut supaya tidak jadi file yatim di Volume.
    try {
      await this.assertAccess(user, entityType, 'write');
      await this.validateEntity(entityType, entityId);

      const limit = maxFilesFor(entityType);
      const count = await this.repository.countByEntity(entityType, entityId);
      if (count >= limit) {
        throw new BadRequestException(`Maksimal ${limit} lampiran per data`);
      }
    } catch (err) {
      unlink(file.path, () => undefined);
      throw err;
    }

    // path.relative menormalkan kedua sisi (termasuk prefix "./") jadi absolute
    // dulu secara internal, jadi aman dipakai walau UPLOAD_DIR ditulis relatif.
    const storedPath = relative(getUploadRoot(), file.path);

    const created = await this.repository.create({
      entityType,
      entityId,
      fileName: file.originalname,
      storedPath,
      mimeType: file.mimetype,
      fileSize: file.size,
      uploadedById: user.id,
    });

    return this.toListItem(created);
  }

  async remove(user: AuthenticatedUser, id: string) {
    const row = await this.repository.findById(id);
    if (!row) {
      throw new NotFoundException('Lampiran tidak ditemukan');
    }
    await this.assertAccess(user, row.entityType, 'write');
    // Soft delete saja — file fisik tetap disimpan (konsisten dengan pola soft
    // delete tabel lain; cleanup file lama bisa jadi job terpisah di Phase 6).
    await this.repository.softDelete(id);
    return { id, deleted: true };
  }

  async getFileForDownload(user: AuthenticatedUser, id: string) {
    const row = await this.repository.findById(id);
    if (!row) {
      throw new NotFoundException('Lampiran tidak ditemukan');
    }
    await this.assertAccess(user, row.entityType, 'view');

    const absolutePath = join(getUploadRoot(), row.storedPath);
    if (!existsSync(absolutePath)) {
      throw new NotFoundException('File fisik tidak ditemukan di server');
    }

    return { stream: createReadStream(absolutePath), fileName: row.fileName, mimeType: row.mimeType };
  }
}
