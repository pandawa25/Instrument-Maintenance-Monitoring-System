import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PmProgramsRepository } from './pm-programs.repository';
import { CreatePmProgramDto } from './dto/create-pm-program.dto';
import { UpdatePmProgramDto } from './dto/update-pm-program.dto';
import { QueryPmProgramDto } from './dto/query-pm-program.dto';
import { VendorsService } from '../vendors/vendors.service';
import { EquipmentService } from '../equipment/equipment.service';
import { PmActivityTypesService } from '../pm-activity-types/pm-activity-types.service';
import { buildPaginationMeta, PaginatedResult } from '../../common/dto/pagination-query.dto';

@Injectable()
export class PmProgramsService {
  constructor(
    private readonly repository: PmProgramsRepository,
    private readonly vendorsService: VendorsService,
    private readonly equipmentService: EquipmentService,
    private readonly activityTypesService: PmActivityTypesService,
  ) {}

  private toListItem(row: any) {
    return {
      id: row.id,
      name: row.name,
      frequencyValue: row.frequencyValue,
      frequencyUnit: row.frequencyUnit,
      vendor: row.vendor,
      startDate: row.startDate,
      status: row.status,
      remarks: row.remarks,
      totalEquipment: row._count?.equipment ?? undefined,
      totalPeriod: row._count?.periods ?? undefined,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }

  private toDetail(row: any) {
    return {
      id: row.id,
      name: row.name,
      frequencyValue: row.frequencyValue,
      frequencyUnit: row.frequencyUnit,
      vendor: row.vendor,
      startDate: row.startDate,
      status: row.status,
      remarks: row.remarks,
      totalPeriod: row._count?.periods ?? 0,
      equipment: row.equipment.map((e: any) => ({
        id: e.equipment.id,
        tagNumber: e.equipment.tagNumber,
        service: e.equipment.service,
        areaCode: e.equipment.area.areaCode,
      })),
      checklistItems: row.checklistItems.map((c: any) => ({
        id: c.id,
        activityType: c.activityType,
        description: c.description,
        sortOrder: c.sortOrder,
      })),
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }

  async findAll(query: QueryPmProgramDto): Promise<PaginatedResult<unknown>> {
    const { rows, total } = await this.repository.findMany(query);
    const data = rows.map((row: any) => this.toListItem(row));
    return { data, meta: buildPaginationMeta(query.page, query.limit, total) };
  }

  async findOne(id: string) {
    const row = await this.repository.findById(id);
    if (!row) {
      throw new NotFoundException('PM Program tidak ditemukan');
    }
    return this.toDetail(row);
  }

  /**
   * Validasi vendorId, equipmentIds, dan activityTypeId tiap checklist item
   * benar-benar ada & belum dihapus. Melempar 400 (bukan 404) karena ini
   * kesalahan input pada request PM Program, bukan resource itu sendiri.
   */
  private async validateReferences(dto: CreatePmProgramDto | UpdatePmProgramDto) {
    if (dto.vendorId) {
      try {
        await this.vendorsService.findOne(dto.vendorId);
      } catch {
        throw new BadRequestException(`Vendor dengan id '${dto.vendorId}' tidak ditemukan`);
      }
    }

    if (dto.equipmentIds) {
      for (const equipmentId of dto.equipmentIds) {
        try {
          await this.equipmentService.findOne(equipmentId);
        } catch {
          throw new BadRequestException(`Equipment dengan id '${equipmentId}' tidak ditemukan`);
        }
      }
    }

    if (dto.checklistItems) {
      for (const item of dto.checklistItems) {
        try {
          await this.activityTypesService.findOne(item.activityTypeId);
        } catch {
          throw new BadRequestException(`PM Activity Type dengan id '${item.activityTypeId}' tidak ditemukan`);
        }
      }
    }
  }

  async create(dto: CreatePmProgramDto) {
    await this.validateReferences(dto);
    const created = await this.repository.create(dto);
    return this.toDetail(created);
  }

  async update(id: string, dto: UpdatePmProgramDto) {
    await this.findOne(id); // memastikan ada & belum dihapus
    await this.validateReferences(dto);
    const updated = await this.repository.update(id, dto);
    return this.toDetail(updated);
  }

  async remove(id: string) {
    await this.findOne(id);

    const periodCount = await this.repository.countPeriods(id);
    if (periodCount > 0) {
      throw new ConflictException(
        `PM Program masih memiliki ${periodCount} periode — nonaktifkan (status Inactive) daripada menghapus, supaya histori tetap tersimpan`,
      );
    }

    await this.repository.softDelete(id);
    return { id, deleted: true };
  }
}
