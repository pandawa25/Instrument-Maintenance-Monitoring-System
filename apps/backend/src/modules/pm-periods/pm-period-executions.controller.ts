import { Body, Controller, Get, Param, Patch, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { PmPeriodExecutionsService } from './pm-period-executions.service';
import { UpdatePmPeriodExecutionDto } from './dto/update-pm-period-execution.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { AuditLog } from '../../common/decorators/audit-log.decorator';
import { ParseUuidPipe } from '../../common/pipes/parse-uuid.pipe';

@ApiTags('PM Period Executions')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('pm-period-executions')
export class PmPeriodExecutionsController {
  constructor(private readonly service: PmPeriodExecutionsService) {}

  @Get(':id')
  @ApiOperation({ summary: 'Detail 1 baris eksekusi (1 equipment dalam 1 periode)' })
  findOne(@Param('id', ParseUuidPipe) id: string) {
    return this.service.findOne(id);
  }

  @Patch(':id')
  @Roles('Admin')
  @AuditLog('PmPeriodExecution')
  @ApiOperation({ summary: 'Isi/update hasil eksekusi PM untuk 1 equipment + hasil checklist (Admin only)' })
  update(@Param('id', ParseUuidPipe) id: string, @Body() dto: UpdatePmPeriodExecutionDto) {
    return this.service.update(id, dto);
  }
}
