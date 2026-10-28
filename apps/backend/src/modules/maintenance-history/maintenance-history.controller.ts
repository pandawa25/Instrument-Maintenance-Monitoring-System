import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { PermissionModule } from '@prisma/client';
import { MaintenanceHistoryService } from './maintenance-history.service';
import { QueryHistoryEquipmentSearchDto } from './dto/query-history-equipment-search.dto';
import { QueryEquipmentHistoryDto } from './dto/query-equipment-history.dto';
import { QueryTopEquipmentDto } from './dto/query-top-equipment.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionGuard } from '../../common/guards/permission.guard';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';
import { ParseUuidPipe } from '../../common/pipes/parse-uuid.pipe';

// Hak akses mengikuti modul CORRECTIVE_MAINTENANCE (view) — modul ini read-only dan tidak punya
// entri sendiri di matriks Role & Permission. Dengan begitu role yang bisa melihat Corrective
// Maintenance otomatis bisa membuka History, tanpa perlu migrasi enum PermissionModule.
@ApiTags('Maintenance History')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionGuard)
@RequirePermission(PermissionModule.CORRECTIVE_MAINTENANCE, 'view')
@Controller('maintenance-history')
export class MaintenanceHistoryController {
  constructor(private readonly service: MaintenanceHistoryService) {}

  // Pencarian equipment untuk halaman awal History (cari berdasarkan tag number).
  // Sengaja endpoint sendiri — /equipment butuh permission EQUIPMENT, sedangkan role yang
  // boleh melihat History belum tentu punya akses ke modul Master Equipment.
  @Get('equipment-search')
  @ApiOperation({ summary: 'Cari equipment (tag number / service) untuk memilih equipment yang akan dilihat history-nya' })
  searchEquipment(@Query() query: QueryHistoryEquipmentSearchDto) {
    return this.service.searchEquipment(query);
  }

  @Get('top-equipment')
  @ApiOperation({ summary: 'Equipment dengan kegiatan maintenance (Corrective + Preventive Completed) terbanyak — default 10' })
  getTopEquipment(@Query() query: QueryTopEquipmentDto) {
    return this.service.getTopEquipment(query);
  }

  @Get('equipment/:equipmentId')
  @ApiOperation({
    summary:
      'History maintenance satu equipment: timeline Corrective + Preventive (terbaru dulu) beserta pemakaian material',
  })
  getEquipmentHistory(@Param('equipmentId', ParseUuidPipe) equipmentId: string, @Query() query: QueryEquipmentHistoryDto) {
    return this.service.getEquipmentHistory(equipmentId, query);
  }
}
