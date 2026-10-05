import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PmPeriodsRepository } from './pm-periods.repository';
import { CreatePmPeriodDto } from './dto/create-pm-period.dto';
import { UpdatePmPeriodDto } from './dto/update-pm-period.dto';
import { PmProgramsService } from '../pm-programs/pm-programs.service';

type DerivedPeriodStatus = 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED' | 'OVERDUE';

function deriveStatus(plannedDate: Date, total: number, completed: number): DerivedPeriodStatus {
  if (total > 0 && completed === total) return 'COMPLETED';
  const isPastDue = plannedDate.getTime() < new Date().setHours(0, 0, 0, 0);
  if (isPastDue) return 'OVERDUE';
  if (completed > 0) return 'IN_PROGRESS';
  return 'SCHEDULED';
}

@Injectable()
export class PmPeriodsService {
  constructor(
    private readonly repository: PmPeriodsRepository,
    private readonly programsService: PmProgramsService,
  ) {}

  async findAllForProgram(pmProgramId: string) {
    await this.programsService.findOne(pmProgramId); // 404 kalau program tidak ada

    const periods = await this.repository.findManyByProgram(pmProgramId);
    return periods.map((period: any) => {
      const total = period.executions.length;
      const completed = period.executions.filter((e: any) => e.status === 'COMPLETED').length;
      return {
        id: period.id,
        periodNumber: period.periodNumber,
        plannedDate: period.plannedDate,
        remarks: period.remarks,
        totalEquipment: total,
        completedEquipment: completed,
        status: deriveStatus(period.plannedDate, total, completed),
        createdAt: period.createdAt,
      };
    });
  }

  async findOne(id: string) {
    const period = await this.repository.findById(id);
    if (!period) {
      throw new NotFoundException('Periode PM tidak ditemukan');
    }

    const total = period.executions.length;
    const completed = period.executions.filter((e: any) => e.status === 'COMPLETED').length;

    return {
      id: period.id,
      pmProgramId: period.pmProgramId,
      periodNumber: period.periodNumber,
      plannedDate: period.plannedDate,
      remarks: period.remarks,
      status: deriveStatus(period.plannedDate, total, completed),
      executions: period.executions.map((e: any) => ({
        id: e.id,
        equipment: e.equipment,
        executionDate: e.executionDate,
        result: e.result,
        findings: e.findings,
        actionTaken: e.actionTaken,
        vendorPersonnel: e.vendorPersonnel,
        remarks: e.remarks,
        status: e.status,
        checklistResults: e.checklistResults.map((c: any) => ({
          id: c.id,
          activityTypeName: c.activityTypeName,
          description: c.description,
          result: c.result,
          notes: c.notes,
          sortOrder: c.sortOrder,
        })),
      })),
      createdAt: period.createdAt,
    };
  }

  async createPeriod(pmProgramId: string, dto: CreatePmPeriodDto) {
    // findOne PmProgramsService melempar 404 kalau program tidak ada, sekaligus
    // memberi daftar equipment & checklist item TERKINI program itu (snapshot dibuat dari sini).
    const program = await this.programsService.findOne(pmProgramId);

    // Nomor boleh diisi manual (mis. melanjutkan penomoran dari data lama / melompati nomor);
    // kalau kosong, otomatis nomor terbesar + 1.
    const periodNumber =
      dto.periodNumber ?? (await this.repository.getNextPeriodNumber(pmProgramId));
    if (dto.periodNumber !== undefined) {
      await this.assertPeriodNumberAvailable(pmProgramId, periodNumber);
    }

    const checklistTemplate = program.checklistItems.map((item: any) => ({
      activityTypeName: item.activityType.name,
      description: item.description,
      sortOrder: item.sortOrder,
    }));

    const equipmentIds = program.equipment.map((e: any) => e.id);

    const created = await this.repository.createWithExecutions(
      pmProgramId,
      periodNumber,
      dto.plannedDate,
      dto.remarks,
      equipmentIds,
      checklistTemplate,
    );

    return this.findOne(created!.id);
  }

  async getNextPeriodNumber(pmProgramId: string) {
    await this.programsService.findOne(pmProgramId); // 404 kalau program tidak ada
    return { nextPeriodNumber: await this.repository.getNextPeriodNumber(pmProgramId) };
  }

  async update(id: string, dto: UpdatePmPeriodDto) {
    const existing = await this.findOne(id);

    // Hanya cek bentrok kalau nomor benar-benar berubah (PATCH yang ikut mengirim nomor lama tetap valid).
    if (dto.periodNumber !== undefined && dto.periodNumber !== existing.periodNumber) {
      await this.assertPeriodNumberAvailable(existing.pmProgramId, dto.periodNumber, id);
    }

    await this.repository.update(id, dto);
    return this.findOne(id);
  }

  private async assertPeriodNumberAvailable(pmProgramId: string, periodNumber: number, excludeId?: string) {
    const holder = await this.repository.findByNumber(pmProgramId, periodNumber);
    if (!holder || holder.id === excludeId) return;

    throw new ConflictException(`Nomor periode ${periodNumber} sudah dipakai periode lain pada program ini`);
  }

  async remove(id: string) {
    await this.findOne(id);

    const completedCount = await this.repository.countCompletedExecutions(id);
    if (completedCount > 0) {
      throw new ConflictException(
        `Periode ini sudah memiliki ${completedCount} eksekusi selesai — tidak bisa dihapus untuk menjaga histori`,
      );
    }

    await this.repository.softDelete(id);
    return { id, deleted: true };
  }
}
