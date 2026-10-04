import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { PermissionModule } from '@prisma/client';
import { DashboardService } from './dashboard.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionGuard } from '../../common/guards/permission.guard';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';

@ApiTags('Dashboard')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionGuard)
@RequirePermission(PermissionModule.DASHBOARD, 'view')
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('summary')
  @ApiOperation({ summary: 'Angka ringkasan untuk summary card Dashboard' })
  getSummary() {
    return this.dashboardService.getSummary();
  }

  @Get('charts')
  @ApiOperation({ summary: 'Data untuk chart Dashboard (tren bulanan, per area, per kategori, PM compliance)' })
  getCharts() {
    return this.dashboardService.getCharts();
  }

  @Get('recent')
  @ApiOperation({ summary: '10 corrective maintenance terbaru + periode PM yang masih pending' })
  getRecent() {
    return this.dashboardService.getRecent();
  }

  @Get('kpi')
  @ApiOperation({ summary: 'KPI: MTTR, MTBF, PM Compliance Rate — overall, per Area, per Instrument' })
  @ApiQuery({ name: 'months', required: false, description: 'Rentang trailing bulan (default 12)', example: 12 })
  getKpi(@Query('months') months?: string) {
    return this.dashboardService.getKpi(months ? Number(months) : undefined);
  }

  @Get('health-index')
  @ApiOperation({ summary: 'Instrument Health Index — skor komposit dari MTTR/MTBF/failure frequency/criticality per instrument' })
  @ApiQuery({ name: 'months', required: false, description: 'Rentang trailing bulan (default 12)', example: 12 })
  getHealthIndex(@Query('months') months?: string) {
    return this.dashboardService.getHealthIndex(months ? Number(months) : undefined);
  }
}
