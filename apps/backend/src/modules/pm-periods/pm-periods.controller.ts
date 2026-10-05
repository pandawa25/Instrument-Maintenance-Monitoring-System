import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { PermissionModule } from '@prisma/client';
import { PmPeriodsService } from './pm-periods.service';
import { CreatePmPeriodDto } from './dto/create-pm-period.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionGuard } from '../../common/guards/permission.guard';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';
import { AuditLog } from '../../common/decorators/audit-log.decorator';
import { ParseUuidPipe } from '../../common/pipes/parse-uuid.pipe';

// Nested di bawah PM Program: /pm-programs/:programId/periods
// Periode adalah bagian dari jadwal PM Program, jadi pakai permission module
// PM_PROGRAM (bukan PM_EXECUTION — itu khusus untuk isi hasil eksekusi per equipment).
@ApiTags('PM Periods')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionGuard)
@Controller('pm-programs/:programId/periods')
export class PmPeriodsController {
  constructor(private readonly service: PmPeriodsService) {}

  @Get()
  @RequirePermission(PermissionModule.PM_PROGRAM, 'view')
  @ApiOperation({ summary: 'List periode milik 1 PM Program, terbaru dulu, dengan status Scheduled/Overdue/dst' })
  findAll(@Param('programId', ParseUuidPipe) programId: string) {
    return this.service.findAllForProgram(programId);
  }

  @Get('next-number')
  @RequirePermission(PermissionModule.PM_PROGRAM, 'create')
  @ApiOperation({
    summary: 'Nomor periode otomatis berikutnya (nomor periode aktif terbesar + 1)',
  })
  nextNumber(@Param('programId', ParseUuidPipe) programId: string) {
    return this.service.getNextPeriodNumber(programId);
  }

  @Post()
  @RequirePermission(PermissionModule.PM_PROGRAM, 'create')
  @AuditLog('PmPeriod')
  @ApiOperation({
    summary:
      'Tambah periode baru — otomatis generate baris eksekusi kosong utk tiap equipment & checklist item program saat ini',
  })
  create(@Param('programId', ParseUuidPipe) programId: string, @Body() dto: CreatePmPeriodDto) {
    return this.service.createPeriod(programId, dto);
  }
}
