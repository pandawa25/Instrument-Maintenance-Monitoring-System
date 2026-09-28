import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { QueryInstrumentNameDto } from './dto/query-instrument-name.dto';
import { CreateInstrumentNameDto } from './dto/create-instrument-name.dto';
import { UpdateInstrumentNameDto } from './dto/update-instrument-name.dto';

/**
 * Satu-satunya tempat yang bicara langsung ke Prisma untuk domain Instrument Name
 * (master data — dulu bernama "Instrument Type"). Mengikuti pola yang sama
 * dengan AreasRepository.
 */
@Injectable()
export class InstrumentNamesRepository {
  constructor(private readonly prisma: PrismaService) {}

  private buildWhere(query: QueryInstrumentNameDto): Prisma.InstrumentNameWhereInput {
    const where: Prisma.InstrumentNameWhereInput = { deletedAt: null };

    if (query.search) {
      where.OR = [
        { code: { contains: query.search, mode: 'insensitive' } },
        { name: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    return where;
  }

  async findMany(query: QueryInstrumentNameDto) {
    const where = this.buildWhere(query);

    const [rows, total] = await this.prisma.$transaction([
      this.prisma.instrumentName.findMany({
        where,
        skip: query.skip,
        take: query.limit,
        orderBy: { [query.sortBy]: query.sortOrder },
        include: { _count: { select: { equipment: true } } },
      }),
      this.prisma.instrumentName.count({ where }),
    ]);

    return { rows, total };
  }

  findAllActive() {
    return this.prisma.instrumentName.findMany({
      where: { deletedAt: null },
      orderBy: { name: 'asc' },
    });
  }

  findById(id: string) {
    return this.prisma.instrumentName.findFirst({
      where: { id, deletedAt: null },
      include: { _count: { select: { equipment: true } } },
    });
  }

  findByCode(code: string) {
    return this.prisma.instrumentName.findFirst({ where: { code, deletedAt: null } });
  }

  create(dto: CreateInstrumentNameDto) {
    return this.prisma.instrumentName.create({ data: dto });
  }

  update(id: string, dto: UpdateInstrumentNameDto) {
    return this.prisma.instrumentName.update({ where: { id }, data: dto });
  }

  softDelete(id: string) {
    return this.prisma.instrumentName.update({ where: { id }, data: { deletedAt: new Date() } });
  }

  countEquipment(instrumentNameId: string) {
    return this.prisma.equipment.count({ where: { instrumentNameId, deletedAt: null } });
  }
}
