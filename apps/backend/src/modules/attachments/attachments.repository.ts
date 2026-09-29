import { Injectable } from '@nestjs/common';
import { AttachmentEntityType } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

interface CreateAttachmentParams {
  entityType: AttachmentEntityType;
  entityId: string;
  fileName: string;
  storedPath: string;
  mimeType: string;
  fileSize: number;
  uploadedById: string;
}

const INCLUDE = {
  uploadedBy: { select: { id: true, fullName: true } },
} as const;

/**
 * Satu-satunya tempat yang bicara langsung ke Prisma untuk domain Attachment.
 * Mengikuti pola yang sama dengan SparePartsRepository.
 */
@Injectable()
export class AttachmentsRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(params: CreateAttachmentParams) {
    return this.prisma.attachment.create({ data: params, include: INCLUDE });
  }

  findMany(entityType: AttachmentEntityType, entityId: string) {
    return this.prisma.attachment.findMany({
      where: { entityType, entityId, deletedAt: null },
      orderBy: { createdAt: 'asc' },
      include: INCLUDE,
    });
  }

  findById(id: string) {
    return this.prisma.attachment.findFirst({ where: { id, deletedAt: null }, include: INCLUDE });
  }

  countByEntity(entityType: AttachmentEntityType, entityId: string) {
    return this.prisma.attachment.count({ where: { entityType, entityId, deletedAt: null } });
  }

  softDelete(id: string) {
    return this.prisma.attachment.update({ where: { id }, data: { deletedAt: new Date() } });
  }
}
