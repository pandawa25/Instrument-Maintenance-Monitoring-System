import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Instrument } from '@prisma/client';
import { InstrumentsRepository } from './instruments.repository';
import { CreateInstrumentDto } from './dto/create-instrument.dto';
import { UpdateInstrumentDto } from './dto/update-instrument.dto';
import { QueryInstrumentDto } from './dto/query-instrument.dto';
import { AreasService } from '../areas/areas.service';
import { InstrumentTypesService } from '../instrument-types/instrument-types.service';
import { buildPaginationMeta, PaginatedResult } from '../../common/dto/pagination-query.dto';

type InstrumentWithRelations = Instrument & {
  area: { id: string; areaCode: string; areaName: string };
  instrumentType: { id: string; typeCode: string; typeName: string };
  maintenance: { maintenanceDate: Date }[];
};

@Injectable()
export class InstrumentsService {
  constructor(
    private readonly repository: InstrumentsRepository,
    private readonly areasService: AreasService,
    private readonly instrumentTypesService: InstrumentTypesService,
  ) {}

  private toListItem(instrument: InstrumentWithRelations) {
    return {
      id: instrument.id,
      tagNumber: instrument.tagNumber,
      instrumentName: instrument.instrumentName,
      description: instrument.description,
      area: instrument.area,
      instrumentType: instrument.instrumentType,
      manufacturer: instrument.manufacturer,
      model: instrument.model,
      serialNumber: instrument.serialNumber,
      installationDate: instrument.installationDate,
      status: instrument.status,
      criticality: instrument.criticality,
      remarks: instrument.remarks,
      lastMaintenanceDate: instrument.maintenance[0]?.maintenanceDate ?? null,
      createdAt: instrument.createdAt,
      updatedAt: instrument.updatedAt,
    };
  }

  /**
   * Memastikan areaId & instrumentTypeId valid dan belum soft-deleted
   * sebelum create/update. Melempar 400 (bukan 404) karena ini kesalahan
   * input pada request Instrument, bukan resource Instrument itu sendiri.
   */
  private async validateReferences(areaId?: string, instrumentTypeId?: string) {
    if (areaId) {
      try {
        await this.areasService.findOne(areaId);
      } catch {
        throw new BadRequestException(`Area dengan id '${areaId}' tidak ditemukan atau tidak aktif`);
      }
    }

    if (instrumentTypeId) {
      try {
        await this.instrumentTypesService.findOne(instrumentTypeId);
      } catch {
        throw new BadRequestException(
          `Instrument type dengan id '${instrumentTypeId}' tidak ditemukan`,
        );
      }
    }
  }

  async findAll(query: QueryInstrumentDto): Promise<PaginatedResult<unknown>> {
    const { rows, total } = await this.repository.findMany(query);
    const data = rows.map((row: InstrumentWithRelations) => this.toListItem(row));
    return { data, meta: buildPaginationMeta(query.page, query.limit, total) };
  }

  async findOne(id: string) {
    const instrument = await this.repository.findById(id);
    if (!instrument) {
      throw new NotFoundException('Instrument tidak ditemukan');
    }
    return this.toListItem(instrument as InstrumentWithRelations);
  }

  async create(dto: CreateInstrumentDto) {
    const existing = await this.repository.findByTagNumber(dto.tagNumber);
    if (existing) {
      throw new ConflictException(`Tag number '${dto.tagNumber}' sudah digunakan`);
    }

    await this.validateReferences(dto.areaId, dto.instrumentTypeId);

    const created = await this.repository.create(dto);
    return this.findOne(created.id);
  }

  async update(id: string, dto: UpdateInstrumentDto) {
    await this.findOne(id); // memastikan ada & belum dihapus

    if (dto.tagNumber) {
      const existing = await this.repository.findByTagNumber(dto.tagNumber);
      if (existing && existing.id !== id) {
        throw new ConflictException(`Tag number '${dto.tagNumber}' sudah digunakan`);
      }
    }

    await this.validateReferences(dto.areaId, dto.instrumentTypeId);

    await this.repository.update(id, dto);
    return this.findOne(id);
  }

  async remove(id: string) {
    await this.findOne(id);

    const maintenanceCount = await this.repository.countMaintenance(id);
    if (maintenanceCount > 0) {
      throw new ConflictException(
        `Instrument masih memiliki ${maintenanceCount} riwayat corrective maintenance — tidak bisa dihapus`,
      );
    }

    await this.repository.softDelete(id);
    return { id, deleted: true };
  }
}
