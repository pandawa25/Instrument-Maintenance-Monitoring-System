import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

/**
 * Instrument Name adalah master data read-only untuk MVP (15 jenis hasil seed,
 * mis. Pressure Transmitter, Temperature Transmitter, dst — sebelumnya bernama
 * "Instrument Type"). CRUD untuk master ini bisa ditambahkan di fase berikutnya
 * jika dibutuhkan; saat ini repository hanya menyediakan query yang dipakai
 * untuk dropdown dan validasi instrument_name_id di module Equipment.
 */
@Injectable()
export class InstrumentNamesRepository {
  constructor(private readonly prisma: PrismaService) {}

  findAllActive() {
    return this.prisma.instrumentName.findMany({
      where: { deletedAt: null },
      orderBy: { name: 'asc' },
    });
  }

  findById(id: string) {
    return this.prisma.instrumentName.findFirst({
      where: { id, deletedAt: null },
    });
  }
}
