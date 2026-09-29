import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Attachment, AttachmentEntityType } from '@prisma/client';
import { createReadStream, existsSync, unlink } from 'fs';
import { join, relative } from 'path';
import { AttachmentsRepository } from './attachments.repository';
import { MAX_FILES_PER_ENTITY, getUploadRoot } from './attachments.multer.config';
import { MaintenanceService } from '../maintenance/maintenance.service';
import { PmPeriodExecutionsService } from '../pm-periods/pm-period-executions.service';

type AttachmentWithUploader = Attachment & { uploadedBy: { id: string; fullName: string } };

@Injectable()
export class AttachmentsService {
  constructor(
    private readonly repository: AttachmentsRepository,
    private readonly maintenanceService: MaintenanceService,
    private readonly pmPeriodExecutionsService: PmPeriodExecutionsService,
  ) {}

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
      }
    } catch {
      throw new BadRequestException(`Data ${entityType} dengan id '${entityId}' tidak ditemukan`);
    }
  }

  async findAllForEntity(entityType: AttachmentEntityType, entityId: string) {
    await this.validateEntity(entityType, entityId);
    const rows = await this.repository.findMany(entityType, entityId);
    return rows.map((row) => this.toListItem(row));
  }

  async create(
    entityType: AttachmentEntityType,
    entityId: string,
    file: Express.Multer.File,
    uploadedById: string,
  ) {
    await this.validateEntity(entityType, entityId);

    const count = await this.repository.countByEntity(entityType, entityId);
    if (count >= MAX_FILES_PER_ENTITY) {
      unlink(file.path, () => undefined); // buang file yang terlanjur ditulis multer sebelum ditolak
      throw new BadRequestException(`Maksimal ${MAX_FILES_PER_ENTITY} lampiran per data`);
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
      uploadedById,
    });

    return this.toListItem(created);
  }

  async remove(id: string) {
    const row = await this.repository.findById(id);
    if (!row) {
      throw new NotFoundException('Lampiran tidak ditemukan');
    }
    // Soft delete saja — file fisik tetap disimpan (konsisten dengan pola soft
    // delete tabel lain; cleanup file lama bisa jadi job terpisah di Phase 6).
    await this.repository.softDelete(id);
    return { id, deleted: true };
  }

  async getFileForDownload(id: string) {
    const row = await this.repository.findById(id);
    if (!row) {
      throw new NotFoundException('Lampiran tidak ditemukan');
    }

    const absolutePath = join(getUploadRoot(), row.storedPath);
    if (!existsSync(absolutePath)) {
      throw new NotFoundException('File fisik tidak ditemukan di server');
    }

    return { stream: createReadStream(absolutePath), fileName: row.fileName, mimeType: row.mimeType };
  }
}
