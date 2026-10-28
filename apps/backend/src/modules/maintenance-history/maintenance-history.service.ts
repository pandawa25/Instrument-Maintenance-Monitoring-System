import { Injectable, NotFoundException } from '@nestjs/common';
import { MaintenanceHistoryRepository } from './maintenance-history.repository';
import { QueryHistoryEquipmentSearchDto } from './dto/query-history-equipment-search.dto';
import { QueryEquipmentHistoryDto } from './dto/query-equipment-history.dto';
import { QueryTopEquipmentDto } from './dto/query-top-equipment.dto';
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

  /**
   * Equipment dengan kegiatan maintenance (Corrective + Preventive Completed) terbanyak —
   * isi awal halaman History supaya tidak kosong. Urutan: total terbanyak, lalu kegiatan terakhir
   * paling baru, lalu tag number.
   */
  async getTopEquipment(query: QueryTopEquipmentDto) {
    const { corrective, preventive } = await this.repository.countMaintenancePerEquipment();

    const agg = new Map<string, { corrective: number; preventive: number; last: Date | null }>();
    const entry = (id: string) => {
      let e = agg.get(id);
      if (!e) agg.set(id, (e = { corrective: 0, preventive: 0, last: null }));
      return e;
    };
    const bumpLast = (e: { last: Date | null }, d: Date | null) => {
      if (d && (!e.last || d > e.last)) e.last = d;
    };
    for (const r of corrective) {
      const e = entry(r.equipmentId);
      e.corrective += r.count;
      bumpLast(e, r.lastDate);
    }
    for (const r of preventive) {
      const e = entry(r.equipmentId);
      e.preventive += r.count;
      bumpLast(e, r.lastDate);
    }

    const ranked = [...agg.entries()]
      .sort(([, a], [, b]) => {
        const diff = b.corrective + b.preventive - (a.corrective + a.preventive);
        if (diff !== 0) return diff;
        return (b.last?.getTime() ?? 0) - (a.last?.getTime() ?? 0);
      })
      .slice(0, query.limit);
    if (ranked.length === 0) return [];

    const equipments = await this.repository.findEquipmentByIds(ranked.map(([id]) => id));
    const byId = new Map(equipments.map((e: any) => [e.id, e]));

    return ranked
      .filter(([id]) => byId.has(id))
      .map(([id, e], index) => ({
        ...(byId.get(id) as object),
        rank: index + 1,
        correctiveCount: e.corrective,
        preventiveCount: e.preventive,
        totalCount: e.corrective + e.preventive,
        lastMaintenanceDate: e.last ? toDateOnly(e.last) : null,
      }));
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
