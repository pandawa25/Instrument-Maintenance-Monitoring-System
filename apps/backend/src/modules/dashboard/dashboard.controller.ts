import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { DashboardService } from './dashboard.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@ApiTags('Dashboard')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('Admin', 'Viewer')
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
}
