import { Injectable, NotFoundException } from '@nestjs/common';
import { MaintenanceHistoryRepository } from './maintenance-history.repository';
import { QueryHistoryEquipmentSearchDto } from './dto/query-history-equipment-search.dto';
import { QueryEquipmentHistoryDto } from './dto/query-equipment-history.dto';
import {
  buildCorrectiveEvent,
  buildPreventiveEvent,
  buildSummary,
  filterByDateRange,
  sortEventsDesc,
  toDateOnly,
  type CorrectiveRow,
  type HistoryEvent,
  type PreventiveRow,
} from './history-timeline.util';

@Injectable()
export class MaintenanceHistoryService {
  constructor(private readonly repository: MaintenanceHistoryRepository) {}

  async searchEquipment(query: QueryHistoryEquipmentSearchDto) {
    return this.repository.searchEquipment(query.search, query.limit);
  }

  async getEquipmentHistory(equipmentId: string, query: QueryEquipmentHistoryDto) {
    const equipment = await this.repository.findEquipmentHeader(equipmentId);
    if (!equipment) {
      throw new NotFoundException('Equipment tidak ditemukan');
    }

    const type = query.type ?? 'ALL';
    const dateFrom = query.dateFrom?.slice(0, 10);
    const dateTo = query.dateTo?.slice(0, 10);

    const [correctiveRows, preventiveRows] = await Promise.all([
      type === 'PREVENTIVE' ? [] : this.repository.findCorrective(equipmentId, dateFrom, dateTo),
      type === 'CORRECTIVE' ? [] : this.repository.findPreventive(equipmentId),
    ]);

    const events: HistoryEvent[] = [
      ...(correctiveRows as unknown as CorrectiveRow[]).map(buildCorrectiveEvent),
      // Tanggal PM diturunkan (executionDate ?? plannedDate), jadi rentang tanggalnya difilter
      // di sini, bukan di query. CM sudah difilter di query; filter ulang tidak berbahaya.
      ...filterByDateRange((preventiveRows as unknown as PreventiveRow[]).map(buildPreventiveEvent), dateFrom, dateTo),
    ];
    const sorted = sortEventsDesc(events);

    return {
      equipment: {
        ...equipment,
        installationDate: equipment.installationDate ? toDateOnly(equipment.installationDate) : null,
      },
      summary: buildSummary(sorted),
      events: sorted,
    };
  }
}
