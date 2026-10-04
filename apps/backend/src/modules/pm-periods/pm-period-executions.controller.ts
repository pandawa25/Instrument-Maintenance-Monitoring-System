import { Body, Controller, Get, Param, Patch, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { PermissionModule } from '@prisma/client';
import { PmPeriodExecutionsService } from './pm-period-executions.service';
import { UpdatePmPeriodExecutionDto } from './dto/update-pm-period-execution.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionGuard } from '../../common/guards/permission.guard';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';
import { AuditLog } from '../../common/decorators/audit-log.decorator';
import { ParseUuidPipe } from '../../common/pipes/parse-uuid.pipe';

// Modul ini sengaja dipisah dari PM_PROGRAM: Vendor hanya boleh mengisi hasil
// eksekusi per periode (PM_EXECUTION), TIDAK boleh mengubah metadata program
// (judul/vendor/frekuensi/jadwal) — lihat desain matriks role di PermissionsService.
@ApiTags('PM Period Executions')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionGuard)
@Controller('pm-period-executions')
export class PmPeriodExecutionsController {
  constructor(private readonly service: PmPeriodExecutionsService) {}

  @Get(':id')
  @RequirePermission(PermissionModule.PM_EXECUTION, 'view')
  @ApiOperation({ summary: 'Detail 1 baris eksekusi (1 equipment dalam 1 periode)' })
  findOne(@Param('id', ParseUuidPipe) id: string) {
    return this.service.findOne(id);
  }

  @Patch(':id')
  @RequirePermission(PermissionModule.PM_EXECUTION, 'edit')
  @AuditLog('PmPeriodExecution')
  @ApiOperation({ summary: 'Isi/update hasil eksekusi PM untuk 1 equipment + hasil checklist' })
  update(@Param('id', ParseUuidPipe) id: string, @Body() dto: UpdatePmPeriodExecutionDto) {
    return this.service.update(id, dto);
  }
}
