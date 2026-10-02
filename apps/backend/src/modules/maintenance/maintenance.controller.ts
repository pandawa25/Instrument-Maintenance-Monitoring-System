import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  Res,
  StreamableFile,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { MaintenanceService } from './maintenance.service';
import { CreateMaintenanceDto } from './dto/create-maintenance.dto';
import { UpdateMaintenanceDto } from './dto/update-maintenance.dto';
import { QueryMaintenanceDto } from './dto/query-maintenance.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { AuditLog } from '../../common/decorators/audit-log.decorator';
import { ParseUuidPipe } from '../../common/pipes/parse-uuid.pipe';
import { CurrentUser, AuthenticatedUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Corrective Maintenance')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('maintenance')
export class MaintenanceController {
  constructor(private readonly maintenanceService: MaintenanceService) {}

  @Get()
  @ApiOperation({ summary: 'List corrective maintenance — filter date range/area/equipment/status, pagination' })
  findAll(@Query() query: QueryMaintenanceDto) {
    return this.maintenanceService.findAll(query);
  }

  // NOTE: path statis (dashboard/*, export) WAJIB didaftarkan sebelum ":id" di bawah —
  // kalau tidak, Nest akan menganggap "dashboard"/"export" sebagai value :id.

  @Get('dashboard/summary')
  @ApiOperation({ summary: '4 KPI card teratas (Open/Overdue, Completed+trend, Waiting Material, Total+trend)' })
  getKpiSummary() {
    return this.maintenanceService.getKpiSummary();
  }

  @Get('dashboard/status-counts')
  @ApiOperation({ summary: 'Count per status untuk badge tab filter (Semua/Open/In Progress/.../Cancelled)' })
  getStatusCounts(@Query() query: QueryMaintenanceDto) {
    return this.maintenanceService.getStatusCounts(query);
  }

  @Get('export')
  @ApiOperation({ summary: 'Export Excel data corrective maintenance sesuai filter yang aktif' })
  async exportExcel(@Query() query: QueryMaintenanceDto, @Res({ passthrough: true }) res: Response) {
    const buffer = await this.maintenanceService.exportToExcel(query);
    res.set({
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="corrective-maintenance-${new Date().toISOString().slice(0, 10)}.xlsx"`,
    });
    return new StreamableFile(buffer);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Detail satu corrective maintenance' })
  findOne(@Param('id', ParseUuidPipe) id: string) {
    return this.maintenanceService.findOne(id);
  }

  @Post()
  @Roles('Admin')
  @AuditLog('CorrectiveMaintenance')
  @ApiOperation({ summary: 'Catat corrective maintenance baru (Admin only)' })
  create(@Body() dto: CreateMaintenanceDto, @CurrentUser() user: AuthenticatedUser) {
    return this.maintenanceService.create(dto, user.id);
  }

  @Patch(':id')
  @Roles('Admin')
  @AuditLog('CorrectiveMaintenance')
  @ApiOperation({ summary: 'Update corrective maintenance (Admin only)' })
  update(
    @Param('id', ParseUuidPipe) id: string,
    @Body() dto: UpdateMaintenanceDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.maintenanceService.update(id, dto, user.id);
  }

  @Delete(':id')
  @Roles('Admin')
  @AuditLog('CorrectiveMaintenance')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Soft delete corrective maintenance (Admin only)' })
  remove(@Param('id', ParseUuidPipe) id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.maintenanceService.remove(id, user.id);
  }
}
