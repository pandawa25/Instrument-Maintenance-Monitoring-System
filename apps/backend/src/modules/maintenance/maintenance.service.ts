import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { CorrectiveMaintenance } from '@prisma/client';
import { MaintenanceRepository } from './maintenance.repository';
import { CreateMaintenanceDto } from './dto/create-maintenance.dto';
import { UpdateMaintenanceDto } from './dto/update-maintenance.dto';
import { QueryMaintenanceDto } from './dto/query-maintenance.dto';
import { EquipmentService } from '../equipment/equipment.service';
import { UsersService } from '../users/users.service';
import { SparePartsService } from '../spare-parts/spare-parts.service';
import { MaterialInputDto } from './dto/material-input.dto';
import { buildPaginationMeta, PaginatedResult } from '../../common/dto/pagination-query.dto';

type MaintenanceWithRelations = CorrectiveMaintenance & {
  equipment: { id: string; tagNumber: string; service: string };
  area: { id: string; areaCode: string; areaName: string };
  technician: { id: string; fullName: string };
  createdBy: { id: string; fullName: string };
  materials: {
    id: string;
    quantity: unknown;
    remarks: string | null;
    sparePart: { id: string; kimap: string; name: string; unit: string };
  }[];
};

@Injectable()
export class MaintenanceService {
  constructor(
    private readonly repository: MaintenanceRepository,
    private readonly equipmentService: EquipmentService,
    private readonly usersService: UsersService,
    private readonly sparePartsService: SparePartsService,
  ) {}

  private toListItem(row: MaintenanceWithRelations) {
    return {
      id: row.id,
      maintenanceDate: row.maintenanceDate,
      equipment: row.equipment,
      area: row.area,
      failureCategory: row.failureCategory,
      problemDescription: row.problemDescription,
      rootCause: row.rootCause,
      actionTaken: row.actionTaken,
      downtimeHours: row.downtimeHours,
      technician: row.technician,
      status: row.status,
      completionDate: row.completionDate,
      createdBy: row.createdBy,
      remarks: row.remarks,
      needsSparePart: row.needsSparePart,
      materials: (row.materials ?? []).map((m) => ({
        id: m.id,
        quantity: m.quantity,
        remarks: m.remarks,
        sparePart: m.sparePart,
      })),
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }

  /**
   * Validasi setiap sparePartId yang dikirim client benar-benar ada & belum
   * dihapus — pola yang sama dengan resolveAreaId/validateTechnician di bawah.
   */
  private async validateMaterials(materials?: MaterialInputDto[]) {
    if (!materials?.length) return;
    for (const material of materials) {
      try {
        await this.sparePartsService.findOne(material.sparePartId);
      } catch {
        throw new BadRequestException(`Spare part dengan id '${material.sparePartId}' tidak ditemukan`);
      }
    }
  }

  /**
   * area_id pada corrective_maintenance didenormalisasi dari equipment.area_id
   * (keputusan design-document.md, untuk performa filter dashboard) — disinkronkan
   * di sini, bukan dipercaya dari input client.
   */
  private async resolveAreaId(equipmentId: string): Promise<string> {
    try {
      const equipment = await this.equipmentService.findOne(equipmentId);
      return equipment.area.id;
    } catch {
      throw new BadRequestException(`Equipment dengan id '${equipmentId}' tidak ditemukan`);
    }
  }

  private async validateTechnician(technicianId: string) {
    try {
      await this.usersService.findOne(technicianId);
    } catch {
      throw new BadRequestException(`Technician dengan id '${technicianId}' tidak ditemukan atau tidak aktif`);
    }
  }

  async findAll(query: QueryMaintenanceDto): Promise<PaginatedResult<unknown>> {
    const { rows, total } = await this.repository.findMany(query);
    const data = rows.map((row: MaintenanceWithRelations) => this.toListItem(row));
    return { data, meta: buildPaginationMeta(query.page, query.limit, total) };
  }

  async findOne(id: string) {
    const row = await this.repository.findById(id);
    if (!row) {
      throw new NotFoundException('Data corrective maintenance tidak ditemukan');
    }
    return this.toListItem(row as MaintenanceWithRelations);
  }

  async create(dto: CreateMaintenanceDto, createdById: string) {
    await this.validateTechnician(dto.technicianId);
    await this.validateMaterials(dto.materials);
    const areaId = await this.resolveAreaId(dto.equipmentId);

    const created = await this.repository.create(dto, areaId, createdById);
    return this.findOne(created.id);
  }

  async update(id: string, dto: UpdateMaintenanceDto) {
    await this.findOne(id); // memastikan ada & belum dihapus

    if (dto.technicianId) {
      await this.validateTechnician(dto.technicianId);
    }
    await this.validateMaterials(dto.materials);

    let areaId: string | undefined;
    if (dto.equipmentId) {
      areaId = await this.resolveAreaId(dto.equipmentId); // sync ulang kalau equipment diganti
    }

    await this.repository.update(id, dto, areaId);
    return this.findOne(id);
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.repository.softDelete(id);
    return { id, deleted: true };
  }
}
