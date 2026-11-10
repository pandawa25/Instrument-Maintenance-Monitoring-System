import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsIn } from 'class-validator';

// Satu metric = satu kombinasi tabel + filter status/stage yang sudah ditentukan di
// DashboardService.getTrend() — dipetakan lewat lookup tetap di service (BUKAN nama
// kolom/tabel mentah dari request), supaya tidak ada celah injection dari query string.
export const TREND_METRICS = [
  // Tab "Aktivitas Maintenance"
  'maintenance_total',
  'maintenance_open',
  'maintenance_in_progress',
  'maintenance_completed',
  // Tab "Sebaran Equipment" (berdasarkan tanggal equipment ditambahkan — createdAt)
  'equipment_total',
  'equipment_active',
  'equipment_standby',
  'equipment_out_of_service',
  // Tab "KPI & Reliability"
  'kpi_failures',
  'kpi_downtime_hours',
  'kpi_pm_completed',
  'kpi_pm_pending',
  // Tab "Work Order (ERP)" — berdasarkan basicStartDate
  'wo_total',
  'wo_created',
  'wo_released',
  'wo_technically_completed',
  'wo_closed',
  'wo_unmatched',
] as const;

export type TrendMetric = (typeof TREND_METRICS)[number];

export class GetTrendQueryDto {
  @ApiProperty({ enum: TREND_METRICS, description: 'Metric yang mau ditampilkan di grafik tren (ditentukan oleh kotak summary yang diklik)' })
  @IsIn(TREND_METRICS)
  metric!: TrendMetric;

  @ApiProperty({ example: '2026-10-27', description: 'Tanggal mulai rentang (YYYY-MM-DD, inklusif)' })
  @IsDateString()
  from!: string;

  @ApiProperty({ example: '2026-11-02', description: 'Tanggal akhir rentang (YYYY-MM-DD, inklusif)' })
  @IsDateString()
  to!: string;
}
