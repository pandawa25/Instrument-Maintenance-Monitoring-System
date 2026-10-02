import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { buildSafeOrderBy } from '../../common/utils/safe-order-by.util';

const SORTABLE_FIELDS = [
  'tagNumber',
  'service',
  'status',
  'criticality',
  'installationDate',
  'createdAt',
  'updatedAt',
] as const;
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
        orderBy: buildSafeOrderBy(query.sortBy, query.sortOrder, SORTABLE_FIELDS, 'createdAt'),
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

  /**
   * Dropdown ringan (tanpa batas limit paginasi) — dipakai mis. untuk multi-select
   * equipment di form PM Program. Sengaja tidak include semua relasi seperti findMany().
   */
  findAllForDropdown() {
    return this.prisma.equipment.findMany({
      where: { deletedAt: null },
      orderBy: { tagNumber: 'asc' },
      select: {
        id: true,
        tagNumber: true,
        service: true,
        area: { select: { areaCode: true } },
      },
    });
  }

  /**
   * Cari equipment AKTIF dengan tag_number yang sama (case-insensitive).
   * Case-insensitive supaya tetap menangkap data lama yang mungkin belum tersimpan
   * dalam bentuk ternormalisasi (lihat normalizeTag() di @shared-utils), bukan cuma
   * data baru yang sudah pasti uppercase. Constraint uniqueness yang sesungguhnya ada
   * di DB (partial unique index UPPER(tag_number) WHERE deleted_at IS NULL) — pre-check
   * di sini hanya untuk pesan error 409 yang lebih ramah daripada P2002 mentah.
   */
  findByTagNumber(tagNumber: string) {
    return this.prisma.equipment.findFirst({
      where: { tagNumber: { equals: tagNumber, mode: 'insensitive' }, deletedAt: null },
    });
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

  /**
   * Preload semua tag_number equipment AKTIF (uppercase) untuk EquipmentImportService —
   * satu query di awal preview, bukan findByTagNumber per baris (hindari N+1 untuk
   * sampai 1000 baris). Tag yang sudah soft-deleted sengaja TIDAK ikut, sejalan dengan
   * partial unique index equipment_tag_number_active_key.
   */
  async findAllActiveTagNumbersUpper(): Promise<Set<string>> {
    const rows = await this.prisma.equipment.findMany({
      where: { deletedAt: null },
      select: { tagNumber: true },
    });
    return new Set(rows.map((r: { tagNumber: string }) => r.tagNumber.toUpperCase()));
  }

  /** Sama seperti findAllActiveTagNumbersUpper(), untuk cek duplikat serial_number (WARNING, bukan ERROR). */
  async findAllActiveSerialNumbersUpper(): Promise<Set<string>> {
    const rows = await this.prisma.equipment.findMany({
      where: { deletedAt: null, serialNumber: { not: null } },
      select: { serialNumber: true },
    });
    return new Set(rows.map((r: { serialNumber: string | null }) => (r.serialNumber as string).toUpperCase()));
  }

  /**
   * Insert banyak equipment sekaligus dalam SATU transaksi interaktif, di-chunk per
   * `chunkSize` baris (default 500) supaya statement tidak terlalu besar. Kalau ada baris
   * yang gagal (mis. race condition tag di-create bersamaan dari tempat lain), Prisma
   * otomatis rollback SELURUH transaksi — sesuai desain create-only all-or-nothing.
   */
  async createManyInTransaction(
    rows: Prisma.EquipmentCreateManyInput[],
    chunkSize = 500,
  ): Promise<void> {
    await this.prisma.$transaction(
      async (tx: any) => {
        for (let i = 0; i < rows.length; i += chunkSize) {
          const chunk = rows.slice(i, i + chunkSize);
          await tx.equipment.createMany({ data: chunk });
        }
      },
      { timeout: 30_000 },
    );
  }
}
