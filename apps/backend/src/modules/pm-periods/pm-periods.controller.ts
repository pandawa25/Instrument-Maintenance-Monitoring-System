import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { PmPeriodsService } from './pm-periods.service';
import { CreatePmPeriodDto } from './dto/create-pm-period.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { ParseUuidPipe } from '../../common/pipes/parse-uuid.pipe';

// Nested di bawah PM Program: /pm-programs/:programId/periods
@ApiTags('PM Periods')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('pm-programs/:programId/periods')
export class PmPeriodsController {
  constructor(private readonly service: PmPeriodsService) {}

  @Get()
  @ApiOperation({ summary: 'List periode milik 1 PM Program, terbaru dulu, dengan status Scheduled/Overdue/dst' })
  findAll(@Param('programId', ParseUuidPipe) programId: string) {
    return this.service.findAllForProgram(programId);
  }

  @Post()
  @Roles('Admin')
  @ApiOperation({
    summary:
      'Tambah periode baru (Admin only) — otomatis generate baris eksekusi kosong utk tiap equipment & checklist item program saat ini',
  })
  create(@Param('programId', ParseUuidPipe) programId: string, @Body() dto: CreatePmPeriodDto) {
    return this.service.createPeriod(programId, dto);
  }
}
