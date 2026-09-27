import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { QueryInstrumentDto } from './dto/query-instrument.dto';
import { CreateInstrumentDto } from './dto/create-instrument.dto';
import { UpdateInstrumentDto } from './dto/update-instrument.dto';

/**
 * Satu-satunya tempat yang bicara langsung ke Prisma untuk domain Instrument.
 * Mengikuti pola yang sama dengan AreasRepository.
 */
@Injectable()
export class InstrumentsRepository {
  constructor(private readonly prisma: PrismaService) {}

  private buildWhere(query: QueryInstrumentDto): Prisma.InstrumentWhereInput {
    const where: Prisma.InstrumentWhereInput = { deletedAt: null };

    if (query.areaId) {
      where.areaId = query.areaId;
    }

    if (query.instrumentTypeId) {
      where.instrumentTypeId = query.instrumentTypeId;
    }

    if (query.status) {
      where.status = query.status;
    }

    if (query.search) {
      where.OR = [
        { tagNumber: { contains: query.search, mode: 'insensitive' } },
        { instrumentName: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    return where;
  }

  async findMany(query: QueryInstrumentDto) {
    const where = this.buildWhere(query);

    const [rows, total] = await this.prisma.$transaction([
      this.prisma.instrument.findMany({
        where,
        skip: query.skip,
        take: query.limit,
        orderBy: { [query.sortBy]: query.sortOrder },
        include: {
          area: { select: { id: true, areaCode: true, areaName: true } },
          instrumentType: { select: { id: true, typeCode: true, typeName: true } },
          maintenance: {
            where: { deletedAt: null, status: 'COMPLETED' },
            orderBy: { maintenanceDate: 'desc' },
            take: 1,
            select: { maintenanceDate: true },
          },
        },
      }),
      this.prisma.instrument.count({ where }),
    ]);

    return { rows, total };
  }

  findById(id: string) {
    return this.prisma.instrument.findFirst({
      where: { id, deletedAt: null },
      include: {
        area: { select: { id: true, areaCode: true, areaName: true } },
        instrumentType: { select: { id: true, typeCode: true, typeName: true } },
        maintenance: {
          where: { deletedAt: null, status: 'COMPLETED' },
          orderBy: { maintenanceDate: 'desc' },
          take: 1,
          select: { maintenanceDate: true },
        },
      },
    });
  }

  findByTagNumber(tagNumber: string) {
    return this.prisma.instrument.findFirst({ where: { tagNumber, deletedAt: null } });
  }

  create(dto: CreateInstrumentDto) {
    const { installationDate, ...rest } = dto;
    return this.prisma.instrument.create({
      data: {
        ...rest,
        installationDate: installationDate ? new Date(installationDate) : undefined,
      },
    });
  }

  update(id: string, dto: UpdateInstrumentDto) {
    const { installationDate, ...rest } = dto;
    return this.prisma.instrument.update({
      where: { id },
      data: {
        ...rest,
        installationDate: installationDate ? new Date(installationDate) : undefined,
      },
    });
  }

  softDelete(id: string) {
    return this.prisma.instrument.update({ where: { id }, data: { deletedAt: new Date() } });
  }

  countMaintenance(instrumentId: string) {
    return this.prisma.correctiveMaintenance.count({ where: { instrumentId, deletedAt: null } });
  }
}
