import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { PermissionModule } from '@prisma/client';
import { PmPeriodsService } from './pm-periods.service';
import { UpdatePmPeriodDto } from './dto/update-pm-period.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionGuard } from '../../common/guards/permission.guard';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';
import { AuditLog } from '../../common/decorators/audit-log.decorator';
import { ParseUuidPipe } from '../../common/pipes/parse-uuid.pipe';

// Akses langsung by id (tidak perlu tahu programId): /pm-periods/:id
// Sama seperti pm-periods.controller.ts — ini bagian dari jadwal PM Program, jadi
// pakai permission module PM_PROGRAM.
@ApiTags('PM Periods')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionGuard)
@Controller('pm-periods')
export class PmPeriodController {
  constructor(private readonly service: PmPeriodsService) {}

  @Get(':id')
  @RequirePermission(PermissionModule.PM_PROGRAM, 'view')
  @ApiOperation({ summary: 'Detail 1 periode — daftar eksekusi per equipment + checklist result' })
  findOne(@Param('id', ParseUuidPipe) id: string) {
    return this.service.findOne(id);
  }

  @Patch(':id')
  @RequirePermission(PermissionModule.PM_PROGRAM, 'edit')
  @AuditLog('PmPeriod')
  @ApiOperation({ summary: 'Update tanggal rencana / remarks periode' })
  update(@Param('id', ParseUuidPipe) id: string, @Body() dto: UpdatePmPeriodDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @RequirePermission(PermissionModule.PM_PROGRAM, 'delete')
  @AuditLog('PmPeriod')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Soft delete periode — ditolak jika sudah ada eksekusi selesai' })
  remove(@Param('id', ParseUuidPipe) id: string) {
    return this.service.remove(id);
  }
}
