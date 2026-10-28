import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

// Batas pengaman per sumber (CM / PM) — satu equipment realistisnya jauh di bawah ini;
// batas ada supaya satu equipment dengan data ekstrem tidak menarik ribuan baris sekaligus.
export const HISTORY_ROW_LIMIT = 1000;

const EQUIPMENT_SEARCH_SELECT = {
  id: true,
  tagNumber: true,
  service: true,
  manufacturer: true,
  model: true,
  status: true,
  area: { select: { id: true, areaCode: true, areaName: true } },
  instrumentName: { select: { id: true, code: true, name: true } },
} satisfies Prisma.EquipmentSelect;

const EQUIPMENT_HEADER_SELECT = {
  ...EQUIPMENT_SEARCH_SELECT,
  description: true,
  serialNumber: true,
  installationDate: true,
  criticality: true,
} satisfies Prisma.EquipmentSelect;

const CORRECTIVE_INCLUDE = {
  technician: { select: { fullName: true } },
  additionalTechnicians: { include: { user: { select: { fullName: true } } } },
  materials: {
    include: { sparePart: { select: { id: true, kimap: true, name: true, unit: true } } },
    orderBy: { createdAt: 'asc' },
  },
} satisfies Prisma.CorrectiveMaintenanceInclude;

const PREVENTIVE_INCLUDE = {
  pmPeriod: {
    select: {
      periodNumber: true,
      plannedDate: true,
      pmProgram: { select: { id: true, name: true, vendor: { select: { name: true } } } },
    },
  },
  checklistResults: { select: { result: true } },
} satisfies Prisma.PmPeriodExecutionInclude;

/** Satu-satunya tempat yang bicara ke Prisma untuk modul History Maintenance (read-only). */
@Injectable()
export class MaintenanceHistoryRepository {
  constructor(private readonly prisma: PrismaService) {}

  searchEquipment(search: string | undefined, limit: number) {
    const term = search?.trim();
    const where: Prisma.EquipmentWhereInput = { deletedAt: null };
    if (term) {
      where.OR = [
        { tagNumber: { contains: term, mode: 'insensitive' } },
        { service: { contains: term, mode: 'insensitive' } },
        { description: { contains: term, mode: 'insensitive' } },
      ];
    }
    return this.prisma.equipment.findMany({
      where,
      select: EQUIPMENT_SEARCH_SELECT,
      orderBy: { tagNumber: 'asc' },
      take: limit,
    });
  }

  /**
   * Jumlah kegiatan per equipment — sama dengan isi timeline History: Corrective (semua status,
   * yang belum dihapus) + Preventive yang sudah COMPLETED. Equipment yang sudah dihapus dikeluarkan
   * di query supaya Top N tidak "bolong". Agregasi di DB (groupBy), bukan menarik baris history.
   */
  async countMaintenancePerEquipment() {
    const [corrective, preventive] = await Promise.all([
      this.prisma.correctiveMaintenance.groupBy({
        by: ['equipmentId'],
        where: { deletedAt: null, equipment: { deletedAt: null } },
        _count: { _all: true },
        _max: { maintenanceDate: true },
      }),
      this.prisma.pmPeriodExecution.groupBy({
        by: ['equipmentId'],
        where: {
          deletedAt: null,
          status: 'COMPLETED',
          equipment: { deletedAt: null },
          pmPeriod: { deletedAt: null, pmProgram: { deletedAt: null } },
        },
        _count: { _all: true },
        _max: { executionDate: true },
      }),
    ]);
    return {
      corrective: corrective.map((r: any) => ({ equipmentId: r.equipmentId as string, count: r._count._all as number, lastDate: (r._max.maintenanceDate ?? null) as Date | null })),
      preventive: preventive.map((r: any) => ({ equipmentId: r.equipmentId as string, count: r._count._all as number, lastDate: (r._max.executionDate ?? null) as Date | null })),
    };
  }

  findEquipmentByIds(ids: string[]) {
    return this.prisma.equipment.findMany({
      where: { id: { in: ids }, deletedAt: null },
      select: EQUIPMENT_SEARCH_SELECT,
    });
  }

  findEquipmentHeader(id: string) {
    return this.prisma.equipment.findFirst({ where: { id, deletedAt: null }, select: EQUIPMENT_HEADER_SELECT });
  }

  findCorrective(equipmentId: string, dateFrom?: string, dateTo?: string) {
    const maintenanceDate: Prisma.DateTimeFilter = {};
    if (dateFrom) maintenanceDate.gte = new Date(`${dateFrom.slice(0, 10)}T00:00:00.000Z`);
    if (dateTo) maintenanceDate.lte = new Date(`${dateTo.slice(0, 10)}T00:00:00.000Z`);

    return this.prisma.correctiveMaintenance.findMany({
      where: {
        equipmentId,
        deletedAt: null,
        ...(dateFrom || dateTo ? { maintenanceDate } : {}),
      },
      include: CORRECTIVE_INCLUDE,
      orderBy: [{ maintenanceDate: 'desc' }, { createdAt: 'desc' }],
      take: HISTORY_ROW_LIMIT,
    });
  }

  /** Hanya eksekusi yang sudah COMPLETED — yang PENDING baru jadwal, belum kegiatan. */
  findPreventive(equipmentId: string) {
    return this.prisma.pmPeriodExecution.findMany({
      where: {
        equipmentId,
        deletedAt: null,
        status: 'COMPLETED',
        pmPeriod: { deletedAt: null, pmProgram: { deletedAt: null } },
      },
      include: PREVENTIVE_INCLUDE,
      orderBy: { updatedAt: 'desc' },
      take: HISTORY_ROW_LIMIT,
    });
  }
}
