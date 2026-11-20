import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PmPeriodExecutionsRepository } from './pm-period-executions.repository';
import { UpdatePmPeriodExecutionDto } from './dto/update-pm-period-execution.dto';

@Injectable()
export class PmPeriodExecutionsService {
  constructor(private readonly repository: PmPeriodExecutionsRepository) {}

  private toDetail(row: any) {
    return {
      id: row.id,
      equipment: row.equipment,
      executionDate: row.executionDate,
      result: row.result,
      findings: row.findings,
      actionTaken: row.actionTaken,
      vendorPersonnel: row.vendorPersonnel,
      remarks: row.remarks,
      status: row.status,
      isHighlighted: row.isHighlighted,
      workOrderNumber: row.workOrderNumber,
      workOrderDate: row.workOrderDate,
      workOrderStatus: row.workOrderStatus,
      checklistResults: row.checklistResults.map((c: any) => ({
        id: c.id,
        activityTypeName: c.activityTypeName,
        description: c.description,
        result: c.result,
        notes: c.notes,
        sortOrder: c.sortOrder,
      })),
    };
  }

  async findOne(id: string) {
    const row = await this.repository.findById(id);
    if (!row) {
      throw new NotFoundException('Eksekusi PM tidak ditemukan');
    }
    return this.toDetail(row);
  }

  async update(id: string, dto: UpdatePmPeriodExecutionDto) {
    await this.findOne(id);

    // UX: kalau tanggal & hasil eksekusi diisi tapi status tidak disebutkan,
    // anggap eksekusi ini selesai — supaya user tak perlu set status manual.
    const payload = { ...dto };
    if (!payload.status && payload.executionDate && payload.result) {
      payload.status = 'COMPLETED' as const;
    }

    const updated = await this.repository.update(id, payload);
    return this.toDetail(updated);
  }

  /**
   * Fitur Highlight Pekerjaan — toggle manual. Menandai (true) ditolak kalau eksekusi sudah
   * Completed (bukan issue aktif lagi) — konsisten dengan auto-clear saat transisi status
   * di PmPeriodExecutionsRepository.update().
   */
  async setHighlighted(id: string, isHighlighted: boolean) {
    const current = await this.findOne(id);
    if (isHighlighted && current.status === 'COMPLETED') {
      throw new BadRequestException('Eksekusi PM yang sudah Completed tidak bisa ditandai sebagai highlight');
    }
    const updated = await this.repository.setHighlighted(id, isHighlighted);
    return this.toDetail(updated);
  }
}
