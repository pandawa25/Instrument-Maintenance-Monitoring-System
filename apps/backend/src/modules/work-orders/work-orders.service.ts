import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { WorkOrdersRepository } from './work-orders.repository';
import { QueryWorkOrderDto } from './dto/query-work-order.dto';
import { RelinkEquipmentDto } from './dto/relink-equipment.dto';
import { EquipmentService } from '../equipment/equipment.service';
import { buildPaginationMeta, PaginatedResult } from '../../common/dto/pagination-query.dto';

@Injectable()
export class WorkOrdersService {
  constructor(
    private readonly repository: WorkOrdersRepository,
    private readonly equipmentService: EquipmentService,
  ) {}

  async findAll(query: QueryWorkOrderDto): Promise<PaginatedResult<unknown>> {
    const { rows, total } = await this.repository.findMany(query);
    return { data: rows, meta: buildPaginationMeta(query.page, query.limit, total) };
  }

  async findOne(id: string) {
    const row = await this.repository.findById(id);
    if (!row) {
      throw new NotFoundException('Data Work Order tidak ditemukan');
    }
    return row;
  }

  /** Ringkasan jumlah per tahap siklus — dipakai stepper di atas list (lihat §9 design doc). */
  getStageCounts(query: QueryWorkOrderDto) {
    return this.repository.getStageCounts(query);
  }

  /**
   * Hubungkan/lepas equipment secara manual — satu-satunya field ERP yang boleh diedit lewat
   * API (field lain read-only, sumbernya import). Dipakai terutama dari "Antrian Belum
   * Terhubung" untuk baris yang gagal match otomatis saat import.
   */
  async relinkEquipment(id: string, dto: RelinkEquipmentDto) {
    await this.findOne(id); // memastikan ada & belum dihapus

    if (dto.equipmentId) {
      try {
        await this.equipmentService.findOne(dto.equipmentId);
      } catch {
        throw new BadRequestException(`Equipment dengan id '${dto.equipmentId}' tidak ditemukan`);
      }
    }

    return this.repository.relinkEquipment(id, dto.equipmentId ?? null);
  }

  /** Dropdown WO milik satu equipment — dipakai field searchable-select di form Corrective Maintenance. */
  findDropdownByEquipment(equipmentId: string) {
    return this.repository.findDropdownByEquipment(equipmentId);
  }

  /** Daftar nilai distinct orderType untuk dropdown filter (lihat WorkOrdersRepository). */
  getOrderTypes() {
    return this.repository.getDistinctOrderTypes();
  }

  /** Dipakai MaintenanceService untuk validasi workOrderId yang dikirim dari form CM. */
  async assertExists(id: string) {
    const row = await this.repository.findByIdSimple(id);
    if (!row) {
      throw new BadRequestException(`Work Order dengan id '${id}' tidak ditemukan`);
    }
    return row;
  }
}
