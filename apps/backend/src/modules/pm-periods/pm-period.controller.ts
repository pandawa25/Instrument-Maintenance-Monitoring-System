import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { PmPeriodsService } from './pm-periods.service';
import { UpdatePmPeriodDto } from './dto/update-pm-period.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { ParseUuidPipe } from '../../common/pipes/parse-uuid.pipe';

// Akses langsung by id (tidak perlu tahu programId): /pm-periods/:id
@ApiTags('PM Periods')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('pm-periods')
export class PmPeriodController {
  constructor(private readonly service: PmPeriodsService) {}

  @Get(':id')
  @ApiOperation({ summary: 'Detail 1 periode — daftar eksekusi per equipment + checklist result' })
  findOne(@Param('id', ParseUuidPipe) id: string) {
    return this.service.findOne(id);
  }

  @Patch(':id')
  @Roles('Admin')
  @ApiOperation({ summary: 'Update tanggal rencana / remarks periode (Admin only)' })
  update(@Param('id', ParseUuidPipe) id: string, @Body() dto: UpdatePmPeriodDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @Roles('Admin')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Soft delete periode (Admin only) — ditolak jika sudah ada eksekusi selesai' })
  remove(@Param('id', ParseUuidPipe) id: string) {
    return this.service.remove(id);
  }
}
