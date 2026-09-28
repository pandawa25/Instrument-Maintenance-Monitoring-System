import { randomUUID } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { ImportBatchStatus, ImportEntityType, ImportRowSeverity, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

export interface NewImportRow {
  rowNumber: number;
  payload: Prisma.InputJsonValue;
  severity: ImportRowSeverity;
  messages: string[];
}

const ROW_INSERT_CHUNK_SIZE = 500;

/**
 * Satu-satunya tempat yang bicara langsung ke Prisma untuk domain Import Batch.
 * Mengikuti pola yang sama dengan EquipmentRepository/AreasRepository.
 */
@Injectable()
export class ImportBatchRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Simpan hasil preview: satu row ImportBatch + semua ImportBatchRow-nya, dalam satu
   * transaksi (kalau baris sampai 1000, insert row di-chunk 500 per createMany).
   * id di-generate manual (randomUUID) — lihat catatan di EquipmentRepository soal
   * @default(uuid()) Prisma untuk createMany.
   */
  async createBatchWithRows(params: {
    entityType: ImportEntityType;
    filename: string;
    fileChecksum: string;
    createdById: string;
    expiresAt: Date;
    rows: NewImportRow[];
  }) {
    const batchId = randomUUID();
    const okRows = params.rows.filter((r) => r.severity === 'OK').length;
    const warningRows = params.rows.filter((r) => r.severity === 'WARNING').length;
    const errorRows = params.rows.filter((r) => r.severity === 'ERROR').length;

    return this.prisma.$transaction(
      async (tx) => {
        const batch = await tx.importBatch.create({
          data: {
            id: batchId,
            entityType: params.entityType,
            filename: params.filename,
            fileChecksum: params.fileChecksum,
            totalRows: params.rows.length,
            okRows,
            warningRows,
            errorRows,
            createdById: params.createdById,
            expiresAt: params.expiresAt,
          },
        });

        for (let i = 0; i < params.rows.length; i += ROW_INSERT_CHUNK_SIZE) {
          const chunk = params.rows.slice(i, i + ROW_INSERT_CHUNK_SIZE).map((r) => ({
            id: randomUUID(),
            batchId,
            rowNumber: r.rowNumber,
            payload: r.payload,
            severity: r.severity,
            messages: r.messages,
          }));
          await tx.importBatchRow.createMany({ data: chunk });
        }

        return batch;
      },
      { timeout: 30_000 },
    );
  }

  findBatchById(id: string) {
    return this.prisma.importBatch.findFirst({ where: { id, deletedAt: null } });
  }

  async findRows(batchId: string, opts: { severity?: ImportRowSeverity; skip: number; take: number }) {
    const where: Prisma.ImportBatchRowWhereInput = {
      batchId,
      deletedAt: null,
      ...(opts.severity ? { severity: opts.severity } : {}),
    };

    const [rows, total] = await this.prisma.$transaction([
      this.prisma.importBatchRow.findMany({
        where,
        skip: opts.skip,
        take: opts.take,
        orderBy: { rowNumber: 'asc' },
      }),
      this.prisma.importBatchRow.count({ where }),
    ]);

    return { rows, total };
  }

  /** Baris yang benar-benar akan di-insert saat commit: OK + WARNING (bukan ERROR). */
  findCommittableRows(batchId: string) {
    return this.prisma.importBatchRow.findMany({
      where: { batchId, deletedAt: null, severity: { in: ['OK', 'WARNING'] } },
      orderBy: { rowNumber: 'asc' },
    });
  }

  updateStatus(batchId: string, status: ImportBatchStatus, committedAt?: Date) {
    return this.prisma.importBatch.update({
      where: { id: batchId },
      data: { status, ...(committedAt ? { committedAt } : {}) },
    });
  }
}
