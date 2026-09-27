import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

/**
 * Instrument Type adalah master data read-only untuk MVP (15 tipe hasil seed).
 * CRUD untuk tipe ini bisa ditambahkan di fase berikutnya jika dibutuhkan;
 * saat ini repository hanya menyediakan query yang dipakai untuk dropdown
 * dan validasi instrument_type_id di module Instrument.
 */
@Injectable()
export class InstrumentTypesRepository {
  constructor(private readonly prisma: PrismaService) {}

  findAllActive() {
    return this.prisma.instrumentType.findMany({
      where: { deletedAt: null },
      orderBy: { typeName: 'asc' },
    });
  }

  findById(id: string) {
    return this.prisma.instrumentType.findFirst({
      where: { id, deletedAt: null },
    });
  }
}
