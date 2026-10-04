import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

/**
 * Satu-satunya tempat yang bicara langsung ke Prisma untuk domain EquipmentBulkOperation /
 * EquipmentChangeSnapshot — READ ONLY. Write (create operation + snapshot, commit revert)
 * sengaja dilakukan langsung lewat PrismaService di dalam transaksi masing-masing service
 * (EquipmentBulkUploadService, EquipmentBulkEditService, EquipmentRevertService) karena
 * transaksinya melintasi beberapa tabel sekaligus (equipment + operation + snapshot) —
 * memecahnya ke beberapa repository method yang masing-masing butuh `tx` yang sama hanya
 * menambah lapisan tanpa manfaat di skala MVP ini.
 */
@Injectable()
export class EquipmentBulkOperationRepository {
  constructor(private readonly prisma: PrismaService) {}

  findById(id: string) {
    return this.prisma.equipmentBulkOperation.findUnique({
      where: { id },
      include: {
        createdBy: { select: { id: true, fullName: true } },
        revertedBy: { select: { id: true, fullName: true } },
        importBatch: { select: { id: true, filename: true } },
      },
    });
  }

  findSnapshots(operationId: string) {
    return this.prisma.equipmentChangeSnapshot.findMany({ where: { operationId } });
  }

  findMany(limit = 50) {
    return this.prisma.equipmentBulkOperation.findMany({
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: {
        createdBy: { select: { id: true, fullName: true } },
        revertedBy: { select: { id: true, fullName: true } },
        importBatch: { select: { id: true, filename: true } },
      },
    });
  }
}
