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
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { SparePartsService } from './spare-parts.service';
import { CreateSparePartDto } from './dto/create-spare-part.dto';
import { UpdateSparePartDto } from './dto/update-spare-part.dto';
import { QuerySparePartDto } from './dto/query-spare-part.dto';
import { CreateStockMovementDto } from './dto/create-stock-movement.dto';
import { QueryStockMovementDto } from './dto/query-stock-movement.dto';
import { QueryAllStockMovementsDto } from './dto/query-all-stock-movements.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { AuditLog } from '../../common/decorators/audit-log.decorator';
import { ParseUuidPipe } from '../../common/pipes/parse-uuid.pipe';
import { CurrentUser, AuthenticatedUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Spare Parts')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('spare-parts')
export class SparePartsController {
  constructor(private readonly sparePartsService: SparePartsService) {}

  @Get()
  @ApiOperation({ summary: 'List spare part / material — search, filter status, pagination' })
  findAll(@Query() query: QuerySparePartDto) {
    return this.sparePartsService.findAll(query);
  }

  @Get('dropdown')
  @ApiOperation({ summary: 'List spare part aktif tanpa pagination — untuk dropdown form Corrective Maintenance' })
  findAllForDropdown() {
    return this.sparePartsService.findAllForDropdown();
  }

  // NOTE: path statis (stock-in, stock-out, dashboard/*) WAJIB didaftarkan sebelum
  // ":id" di bawah — kalau tidak, Nest akan menganggap "stock-in" dkk sebagai value :id.

  @Get('stock-in')
  @ApiOperation({ summary: 'Ledger lintas spare part khusus Stock In (RESTOCK) — pagination, search, date range' })
  listStockIn(@Query() query: QueryAllStockMovementsDto) {
    // `type` di-set di sini (bukan dari query user) supaya halaman Stock In tidak
    // bisa diarahkan menampilkan baris Stock Out/Adjustment lewat query string.
    query.type = 'RESTOCK';
    return this.sparePartsService.listAllMovements(query);
  }

  @Get('stock-out')
  @ApiOperation({ summary: 'Ledger lintas spare part khusus Stock Out — pagination, search, date range' })
  listStockOut(@Query() query: QueryAllStockMovementsDto) {
    query.type = 'STOCK_OUT';
    return this.sparePartsService.listAllMovements(query);
  }

  @Get('dashboard/summary')
  @ApiOperation({ summary: 'Summary card Inventory Dashboard — total item, total stock, low stock, out of stock' })
  getDashboardSummary() {
    return this.sparePartsService.getDashboardSummary();
  }

  @Get('dashboard/charts')
  @ApiOperation({ summary: 'Tren Stock In/Out bulanan + daftar low-stock item untuk Inventory Dashboard' })
  @ApiQuery({ name: 'months', required: false, description: 'Rentang trailing bulan (default 6)', example: 6 })
  getDashboardCharts(@Query('months') months?: string) {
    return this.sparePartsService.getDashboardCharts(months ? Number(months) : undefined);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Detail satu spare part / material' })
  findOne(@Param('id', ParseUuidPipe) id: string) {
    return this.sparePartsService.findOne(id);
  }

  @Post()
  @Roles('Admin')
  @AuditLog('SparePart')
  @ApiOperation({ summary: 'Buat spare part / material baru (Admin only)' })
  create(@Body() dto: CreateSparePartDto, @CurrentUser() user: AuthenticatedUser) {
    return this.sparePartsService.create(dto, user.id);
  }

  @Patch(':id')
  @Roles('Admin')
  @AuditLog('SparePart')
  @ApiOperation({ summary: 'Update spare part / material (Admin only)' })
  update(@Param('id', ParseUuidPipe) id: string, @Body() dto: UpdateSparePartDto) {
    return this.sparePartsService.update(id, dto);
  }

  @Delete(':id')
  @Roles('Admin')
  @AuditLog('SparePart')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Soft delete spare part / material (Admin only) — ditolak jika masih dipakai' })
  remove(@Param('id', ParseUuidPipe) id: string) {
    return this.sparePartsService.remove(id);
  }

  @Get(':id/stock-movements')
  @ApiOperation({ summary: 'Riwayat pergerakan stock (ledger) satu spare part — pagination' })
  listMovements(@Param('id', ParseUuidPipe) id: string, @Query() query: QueryStockMovementDto) {
    return this.sparePartsService.listMovements(id, query);
  }

  // Sengaja TIDAK dipasangi @AuditLog() — endpoint ini sudah punya jejak audit
  // sendiri yang lebih detail lewat StockMovementLedger (siapa/kapan/tipe/
  // quantityDelta/balanceAfter), mencatatnya lagi ke audit_logs generik hanya
  // akan jadi duplikat yang membingungkan. Lihat SparePartsRepository.recordMovement.
  @Post(':id/stock-movements')
  @Roles('Admin')
  @ApiOperation({ summary: 'Stock In / Stock Out / Adjustment manual (Admin only) — selalu tercatat di ledger' })
  createMovement(
    @Param('id', ParseUuidPipe) id: string,
    @Body() dto: CreateStockMovementDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.sparePartsService.createMovement(id, dto, user.id);
  }
}
