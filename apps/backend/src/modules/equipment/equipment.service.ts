import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Equipment } from '@prisma/client';
import { normalizeTag } from '@imms/shared-utils';
import { EquipmentRepository } from './equipment.repository';
import { CreateEquipmentDto } from './dto/create-equipment.dto';
import { UpdateEquipmentDto } from './dto/update-equipment.dto';
import { QueryEquipmentDto } from './dto/query-equipment.dto';
import { AreasService } from '../areas/areas.service';
import { InstrumentNamesService } from '../instrument-names/instrument-names.service';
import { buildPaginationMeta, PaginatedResult } from '../../common/dto/pagination-query.dto';

type EquipmentWithRelations = Equipment & {
  area: { id: string; areaCode: string; areaName: string };
  instrumentName: { id: string; code: string; name: string };
  maintenance: { maintenanceDate: Date }[];
};

@Injectable()
export class EquipmentService {
  constructor(
    private readonly repository: EquipmentRepository,
    private readonly areasService: AreasService,
    private readonly instrumentNamesService: InstrumentNamesService,
  ) {}

  private toListItem(equipment: EquipmentWithRelations) {
    return {
      id: equipment.id,
      tagNumber: equipment.tagNumber,
      service: equipment.service,
      description: equipment.description,
      area: equipment.area,
      instrumentName: equipment.instrumentName,
      type: equipment.type,
      manufacturer: equipment.manufacturer,
      model: equipment.model,
      serialNumber: equipment.serialNumber,
      installationDate: equipment.installationDate,
      lrv: equipment.lrv,
      urv: equipment.urv,
      unit: equipment.unit,
      size: equipment.size,
      rating: equipment.rating,
      failAction: equipment.failAction,
      status: equipment.status,
      criticality: equipment.criticality,
      remarks: equipment.remarks,
      lastMaintenanceDate: equipment.maintenance[0]?.maintenanceDate ?? null,
      createdAt: equipment.createdAt,
      updatedAt: equipment.updatedAt,
    };
  }

  /**
   * Memastikan areaId & instrumentNameId valid dan belum soft-deleted
   * sebelum create/update. Melempar 400 (bukan 404) karena ini kesalahan
   * input pada request Equipment, bukan resource Equipment itu sendiri.
   */
  private async validateReferences(areaId?: string, instrumentNameId?: string) {
    if (areaId) {
      try {
        await this.areasService.findOne(areaId);
      } catch {
        throw new BadRequestException(`Area dengan id '${areaId}' tidak ditemukan atau tidak aktif`);
      }
    }

    if (instrumentNameId) {
      try {
        await this.instrumentNamesService.findOne(instrumentNameId);
      } catch {
        throw new BadRequestException(
          `Instrument name dengan id '${instrumentNameId}' tidak ditemukan`,
        );
      }
    }
  }

  async findAll(query: QueryEquipmentDto): Promise<PaginatedResult<unknown>> {
    const { rows, total } = await this.repository.findMany(query);
    const data = rows.map((row: EquipmentWithRelations) => this.toListItem(row));
    return { data, meta: buildPaginationMeta(query.page, query.limit, total) };
  }

  async findOne(id: string) {
    const equipment = await this.repository.findById(id);
    if (!equipment) {
      throw new NotFoundException('Equipment tidak ditemukan');
    }
    return this.toListItem(equipment as EquipmentWithRelations);
  }

  findAllForDropdown() {
    return this.repository.findAllForDropdown();
  }

  async create(dto: CreateEquipmentDto) {
    // Selalu normalisasi tag_number (trim, rapikan spasi, uppercase) sebelum dicek atau
    // disimpan — harus konsisten dengan constraint DB (partial unique index case-insensitive
    // di migration 20260928000100_equipment_tag_partial_unique) dan dengan modul import nanti.
    const tagNumber = normalizeTag(dto.tagNumber);

    // Pre-check ini murni untuk pesan error yang ramah (409 dengan nama field jelas).
    // Constraint DB tetap jadi pagar terakhir kalau ada race condition di antara
    // pre-check ini dan insert (lihat catatan di equipment.repository.ts).
    const existing = await this.repository.findByTagNumber(tagNumber);
    if (existing) {
      throw new ConflictException(`Tag number '${tagNumber}' sudah digunakan`);
    }

    await this.validateReferences(dto.areaId, dto.instrumentNameId);

    const created = await this.repository.create({ ...dto, tagNumber });
    return this.findOne(created.id);
  }

  async update(id: string, dto: UpdateEquipmentDto) {
    await this.findOne(id); // memastikan ada & belum dihapus

    let tagNumber: string | undefined;
    if (dto.tagNumber) {
      tagNumber = normalizeTag(dto.tagNumber);
      const existing = await this.repository.findByTagNumber(tagNumber);
      if (existing && existing.id !== id) {
        throw new ConflictException(`Tag number '${tagNumber}' sudah digunakan`);
      }
    }

    await this.validateReferences(dto.areaId, dto.instrumentNameId);

    await this.repository.update(id, { ...dto, ...(tagNumber ? { tagNumber } : {}) });
    return this.findOne(id);
  }

  async remove(id: string) {
    await this.findOne(id);

    const maintenanceCount = await this.repository.countMaintenance(id);
    if (maintenanceCount > 0) {
      throw new ConflictException(
        `Equipment masih memiliki ${maintenanceCount} riwayat corrective maintenance — tidak bisa dihapus`,
      );
    }

    await this.repository.softDelete(id);
    return { id, deleted: true };
  }
}
