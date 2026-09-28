import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { QueryEquipmentDto } from './dto/query-equipment.dto';
import { CreateEquipmentDto } from './dto/create-equipment.dto';
import { UpdateEquipmentDto } from './dto/update-equipment.dto';

/**
 * Satu-satunya tempat yang bicara langsung ke Prisma untuk domain Equipment
 * (dulu bernama "Instrument"). Mengikuti pola yang sama dengan AreasRepository.
 */
@Injectable()
export class EquipmentRepository {
  constructor(private readonly prisma: PrismaService) {}

  private buildWhere(query: QueryEquipmentDto): Prisma.EquipmentWhereInput {
    const where: Prisma.EquipmentWhereInput = { deletedAt: null };

    if (query.areaId) {
      where.areaId = query.areaId;
    }

    if (query.instrumentNameId) {
      where.instrumentNameId = query.instrumentNameId;
    }

    if (query.status) {
      where.status = query.status;
    }

    if (query.search) {
      where.OR = [
        { tagNumber: { contains: query.search, mode: 'insensitive' } },
        { service: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    return where;
  }

  async findMany(query: QueryEquipmentDto) {
    const where = this.buildWhere(query);

    const [rows, total] = await this.prisma.$transaction([
      this.prisma.equipment.findMany({
        where,
        skip: query.skip,
        take: query.limit,
        orderBy: { [query.sortBy]: query.sortOrder },
        include: {
          area: { select: { id: true, areaCode: true, areaName: true } },
          instrumentName: { select: { id: true, code: true, name: true } },
          maintenance: {
            where: { deletedAt: null, status: 'COMPLETED' },
            orderBy: { maintenanceDate: 'desc' },
            take: 1,
            select: { maintenanceDate: true },
          },
        },
      }),
      this.prisma.equipment.count({ where }),
    ]);

    return { rows, total };
  }

  findById(id: string) {
    return this.prisma.equipment.findFirst({
      where: { id, deletedAt: null },
      include: {
        area: { select: { id: true, areaCode: true, areaName: true } },
        instrumentName: { select: { id: true, code: true, name: true } },
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
    return this.prisma.equipment.findFirst({ where: { tagNumber, deletedAt: null } });
  }

  create(dto: CreateEquipmentDto) {
    const { installationDate, ...rest } = dto;
    return this.prisma.equipment.create({
      data: {
        ...rest,
        installationDate: installationDate ? new Date(installationDate) : undefined,
      },
    });
  }

  update(id: string, dto: UpdateEquipmentDto) {
    const { installationDate, ...rest } = dto;
    return this.prisma.equipment.update({
      where: { id },
      data: {
        ...rest,
        installationDate: installationDate ? new Date(installationDate) : undefined,
      },
    });
  }

  softDelete(id: string) {
    return this.prisma.equipment.update({ where: { id }, data: { deletedAt: new Date() } });
  }

  countMaintenance(equipmentId: string) {
    return this.prisma.correctiveMaintenance.count({ where: { equipmentId, deletedAt: null } });
  }
}
