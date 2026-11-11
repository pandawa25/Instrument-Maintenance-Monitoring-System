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
   * Equipment dengan kegiatan maintenance terbanyak — isi awal halaman History supaya tidak
   * kosong. Dua ranking TERPISAH (Corrective vs Preventive Completed), masing-masing dibatasi ke
   * `query.months` bulan terakhir (default 6). Urutan tiap list: jumlah terbanyak, lalu kegiatan
   * terakhir paling baru.
   */
  async getTopEquipment(query: QueryTopEquipmentDto) {
    const from = new Date();
    from.setMonth(from.getMonth() - query.months);

    const { corrective, preventive } = await this.repository.countMaintenancePerEquipment(from);

    const rank = (rows: { equipmentId: string; count: number; lastDate: Date | null }[]) =>
      [...rows]
        .sort((a, b) => {
          const diff = b.count - a.count;
          if (diff !== 0) return diff;
          return (b.lastDate?.getTime() ?? 0) - (a.lastDate?.getTime() ?? 0);
        })
        .slice(0, query.limit);

    const topCorrective = rank(corrective);
    const topPreventive = rank(preventive);

    const ids = [...new Set([...topCorrective, ...topPreventive].map((r) => r.equipmentId))];
    if (ids.length === 0) return { corrective: [], preventive: [] };

    const equipments = await this.repository.findEquipmentByIds(ids);
    const byId = new Map(equipments.map((e: any) => [e.id, e]));

    const toItems = (rows: typeof topCorrective) =>
      rows
        .filter((r) => byId.has(r.equipmentId))
        .map((r, index) => ({
          ...(byId.get(r.equipmentId) as object),
          rank: index + 1,
          count: r.count,
          lastMaintenanceDate: r.lastDate ? toDateOnly(r.lastDate) : null,
        }));

    return { corrective: toItems(topCorrective), preventive: toItems(topPreventive) };
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
