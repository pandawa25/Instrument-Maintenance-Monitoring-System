import { Injectable } from '@nestjs/common';
import { PermissionModule } from '@prisma/client';
import { HighlightsRepository } from './highlights.repository';
import { PermissionsService } from '../permissions/permissions.service';
import { AuthenticatedUser } from '../../common/decorators/current-user.decorator';

export type HighlightType = 'CORRECTIVE_MAINTENANCE' | 'PM_EXECUTION' | 'WORK_ORDER';

export interface HighlightItem {
  id: string;
  type: HighlightType;
  // Dipakai FE untuk link "Buka detail" ke halaman asli masing-masing modul.
  linkTo: string;
  title: string;
  date: string | null;
  status: string;
  equipmentTag: string | null;
  equipmentService: string | null;
}

/**
 * Gabungan 3 sumber data untuk halaman /highlights. TIDAK dikunci permission tunggal di
 * controller (lihat HighlightsController) — tiap section difilter SENDIRI di sini sesuai
 * hak akses VIEW user ke modul masing-masing, supaya user yang cuma punya akses 1-2 modul
 * tetap bisa buka halaman ini dan melihat section yang dia boleh lihat saja.
 */
@Injectable()
export class HighlightsService {
  constructor(
    private readonly repository: HighlightsRepository,
    private readonly permissionsService: PermissionsService,
  ) {}

  async findAll(user: AuthenticatedUser): Promise<HighlightItem[]> {
    const [canViewCm, canViewPm, canViewWo] = await Promise.all([
      this.permissionsService.hasPermission(user, PermissionModule.CORRECTIVE_MAINTENANCE, 'view'),
      this.permissionsService.hasPermission(user, PermissionModule.PM_EXECUTION, 'view'),
      this.permissionsService.hasPermission(user, PermissionModule.WORK_ORDER, 'view'),
    ]);

    const [cmRows, pmRows, woRows] = await Promise.all([
      canViewCm ? this.repository.findHighlightedCm() : Promise.resolve([]),
      canViewPm ? this.repository.findHighlightedPmExecution() : Promise.resolve([]),
      canViewWo ? this.repository.findHighlightedWorkOrder() : Promise.resolve([]),
    ]);

    const items: HighlightItem[] = [
      ...cmRows.map((row): HighlightItem => ({
        id: row.id,
        type: 'CORRECTIVE_MAINTENANCE',
        linkTo: `/maintenance/${row.id}`,
        title: row.problemDescription,
        date: row.maintenanceDate ? row.maintenanceDate.toISOString() : null,
        status: row.status,
        equipmentTag: row.equipment?.tagNumber ?? null,
        equipmentService: row.equipment?.service ?? null,
      })),
      ...pmRows.map((row): HighlightItem => ({
        id: row.id,
        type: 'PM_EXECUTION',
        // Tidak ada halaman detail standalone untuk 1 execution — dialog isi checklist-nya
        // dibuka dari dalam halaman Program (lihat PmProgramDetailPage: state `executionId`).
        // Deep-link lewat query param `openExecution`, halaman tujuan baca ini saat mount.
        linkTo: row.pmPeriod?.pmProgram?.id
          ? `/pm-programs/${row.pmPeriod.pmProgram.id}?openExecution=${row.id}`
          : '/pm-programs',
        title: `${row.pmPeriod?.pmProgram?.name ?? 'PM'} — Periode ${row.pmPeriod?.periodNumber ?? '-'}`,
        date: row.executionDate ? row.executionDate.toISOString() : null,
        status: row.status,
        equipmentTag: row.equipment?.tagNumber ?? null,
        equipmentService: row.equipment?.service ?? null,
      })),
      ...woRows.map((row): HighlightItem => ({
        id: row.id,
        type: 'WORK_ORDER',
        // List WO memakai dialog (state `viewingId`), bukan rute per-id — deep-link lewat
        // query param `open`, dibaca saat mount oleh WorkOrderListPage.
        linkTo: `/work-orders?open=${row.id}`,
        title: `${row.orderNo} — ${row.description}`,
        date: row.basicStartDate ? row.basicStartDate.toISOString() : null,
        status: row.lifecycleStage,
        equipmentTag: row.equipment?.tagNumber ?? null,
        equipmentService: row.equipment?.service ?? null,
      })),
    ];

    // Urut tanggal terbaru lebih dulu, gabungan 3 sumber — null date (belum terisi) ditaruh
    // paling bawah supaya tidak mendominasi urutan "terbaru".
    return items.sort((a, b) => {
      if (!a.date && !b.date) return 0;
      if (!a.date) return 1;
      if (!b.date) return -1;
      return b.date.localeCompare(a.date);
    });
  }
}
