import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import * as ExcelJS from 'exceljs';
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
  additionalTechnicians: { user: { id: string; fullName: string } }[];
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
      spkNumber: row.spkNumber,
      maintenanceDate: row.maintenanceDate,
      equipment: row.equipment,
      area: row.area,
      failureCategory: row.failureCategory,
      problemDescription: row.problemDescription,
      rootCause: row.rootCause,
      actionTaken: row.actionTaken,
      downtimeHours: row.downtimeHours,
      technician: row.technician,
      additionalTechnicians: (row.additionalTechnicians ?? []).map((t) => t.user),
      priority: row.priority,
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
      notificationNumber: row.notificationNumber,
      notificationDate: row.notificationDate,
      notificationStatus: row.notificationStatus,
      workOrderNumber: row.workOrderNumber,
      workOrderDate: row.workOrderDate,
      workOrderStatus: row.workOrderStatus,
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

  /** Validasi technician TAMBAHAN — pola sama dengan validateTechnician di atas. */
  private async validateAdditionalTechnicians(technicianIds?: string[]) {
    if (!technicianIds?.length) return;
    for (const technicianId of technicianIds) {
      await this.validateTechnician(technicianId);
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
    await this.validateAdditionalTechnicians(dto.additionalTechnicianIds);
    await this.validateMaterials(dto.materials);
    const areaId = await this.resolveAreaId(dto.equipmentId);

    const created = await this.repository.create(dto, areaId, createdById);
    return this.findOne(created.id);
  }

  async update(id: string, dto: UpdateMaintenanceDto, actorId: string) {
    const current = await this.findOne(id); // memastikan ada & belum dihapus

    if (dto.technicianId) {
      await this.validateTechnician(dto.technicianId);
    }
    await this.validateAdditionalTechnicians(dto.additionalTechnicianIds);
    await this.validateMaterials(dto.materials);

    let areaId: string | undefined;
    if (dto.equipmentId) {
      areaId = await this.resolveAreaId(dto.equipmentId); // sync ulang kalau equipment diganti
    }

    await this.repository.update(id, dto, actorId, current.status, areaId);
    return this.findOne(id);
  }

  async remove(id: string, actorId: string) {
    await this.findOne(id);
    await this.repository.softDelete(id, actorId);
    return { id, deleted: true };
  }

  /** 4 summary card paling atas halaman list — lihat catatan asumsi di repository.getKpiSummary(). */
  getKpiSummary() {
    return this.repository.getKpiSummary();
  }

  /** Count per status untuk badge di tiap tab filter (Semua/Open/.../Cancelled). */
  getStatusCounts(query: QueryMaintenanceDto) {
    return this.repository.getStatusCounts(query);
  }

  /** Export Excel — semua baris yang cocok filter (TANPA pagination), 1 sheet. */
  async exportToExcel(query: QueryMaintenanceDto): Promise<Buffer> {
    const rows = await this.repository.findAllForExport(query);
    const items = rows.map((row: MaintenanceWithRelations) => this.toListItem(row));

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Corrective Maintenance');
    sheet.columns = [
      { header: 'No. e-SPK', key: 'spkNumber', width: 18 },
      { header: 'Tanggal', key: 'maintenanceDate', width: 14 },
      { header: 'Tag Number', key: 'tagNumber', width: 16 },
      { header: 'Service', key: 'service', width: 26 },
      { header: 'Area', key: 'area', width: 14 },
      { header: 'Failure Category', key: 'failureCategory', width: 18 },
      { header: 'Problem Description', key: 'problemDescription', width: 40 },
      { header: 'Priority', key: 'priority', width: 12 },
      { header: 'Status', key: 'status', width: 16 },
      { header: 'PIC', key: 'pic', width: 20 },
      { header: 'Downtime (jam)', key: 'downtimeHours', width: 14 },
      { header: 'Completion Date', key: 'completionDate', width: 16 },
      { header: 'Remarks', key: 'remarks', width: 30 },
    ];
    sheet.getRow(1).font = { bold: true };

    for (const item of items) {
      sheet.addRow({
        spkNumber: item.spkNumber,
        maintenanceDate: new Date(item.maintenanceDate).toLocaleDateString('id-ID'),
        tagNumber: item.equipment.tagNumber,
        service: item.equipment.service,
        area: item.area.areaCode,
        failureCategory: item.failureCategory,
        problemDescription: item.problemDescription,
        priority: item.priority,
        status: item.status,
        pic: item.technician.fullName,
        downtimeHours: item.downtimeHours ?? '',
        completionDate: item.completionDate ? new Date(item.completionDate).toLocaleDateString('id-ID') : '',
        remarks: item.remarks ?? '',
      });
    }

    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }
}
