import {
  BadRequestException,
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
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import { ApiBearerAuth, ApiConsumes, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { PermissionModule } from '@prisma/client';
import { SparePartsService } from './spare-parts.service';
import { CreateSparePartDto } from './dto/create-spare-part.dto';
import { UpdateSparePartDto } from './dto/update-spare-part.dto';
import { QuerySparePartDto } from './dto/query-spare-part.dto';
import { CreateStockMovementDto } from './dto/create-stock-movement.dto';
import { QueryStockMovementDto } from './dto/query-stock-movement.dto';
import { QueryAllStockMovementsDto, resolveStockOutTypes } from './dto/query-all-stock-movements.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { BulkUploadSparePartDto } from './dto/bulk-upload-spare-part.dto';
import { SparePartsBulkUploadService } from './spare-parts-bulk-upload.service';
import { PermissionGuard } from '../../common/guards/permission.guard';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';
import { AuditLog } from '../../common/decorators/audit-log.decorator';
import { ParseUuidPipe } from '../../common/pipes/parse-uuid.pipe';
import { CurrentUser, AuthenticatedUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Spare Parts')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionGuard)
@Controller('spare-parts')
export class SparePartsController {
  constructor(
    private readonly sparePartsService: SparePartsService,
    private readonly bulkUploadService: SparePartsBulkUploadService,
  ) {}

  @Get()
  @RequirePermission(PermissionModule.SPARE_PART, 'view')
  @ApiOperation({ summary: 'List spare part / material — search, filter status, pagination' })
  findAll(@Query() query: QuerySparePartDto) {
    return this.sparePartsService.findAll(query);
  }

  @Get('dropdown')
  @RequirePermission(PermissionModule.SPARE_PART, 'view')
  @ApiOperation({ summary: 'List spare part aktif tanpa pagination — untuk dropdown form Corrective Maintenance' })
  findAllForDropdown() {
    return this.sparePartsService.findAllForDropdown();
  }

  // NOTE: path statis (stock-in, stock-out, dashboard/*) WAJIB didaftarkan sebelum
  // ":id" di bawah — kalau tidak, Nest akan menganggap "stock-in" dkk sebagai value :id.

  @Get('stock-in')
  @RequirePermission(PermissionModule.SPARE_PART, 'view')
  @ApiOperation({ summary: 'Ledger lintas spare part khusus Stock In (RESTOCK) — pagination, search, date range' })
  listStockIn(@Query() query: QueryAllStockMovementsDto) {
    // `type` di-set di sini (bukan dari query user) supaya halaman Stock In tidak
    // bisa diarahkan menampilkan baris Stock Out/Adjustment lewat query string.
    query.type = 'RESTOCK';
    return this.sparePartsService.listAllMovements(query);
  }

  @Get('stock-out')
  @RequirePermission(PermissionModule.SPARE_PART, 'view')
  @ApiOperation({
    summary:
      'Ledger pengeluaran stock — Stock Out manual + pemakaian Corrective Maintenance (filter source), pagination, search, date range',
  })
  listStockOut(@Query() query: QueryAllStockMovementsDto) {
    // Bukan dari query user: tipe yang tampil ditentukan oleh `source` (lihat resolveStockOutTypes).
    query.type = undefined;
    query.types = resolveStockOutTypes(query.source);
    return this.sparePartsService.listAllMovements(query);
  }

  // Bulk upload: SENGAJA dikunci @Roles('Admin') (statis) DI ATAS permission SPARE_PART 'create' —
  // sesuai permintaan, hanya Admin yang boleh, apa pun isi matriks permission role lain.
  // Dua POST di bawah menerima file yang sama (stateless: commit memvalidasi ulang file-nya).
  @Get('bulk-upload/template')
  @UseGuards(RolesGuard)
  @Roles('Admin')
  @RequirePermission(PermissionModule.SPARE_PART, 'create')
  @ApiOperation({ summary: '[Admin only] Download template Excel bulk upload spare part' })
  async downloadBulkUploadTemplate(@Res({ passthrough: true }) res: Response) {
    const buffer = await this.bulkUploadService.generateTemplate();
    res.set({
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': 'attachment; filename="spare-part-bulk-upload-template.xlsx"',
    });
    return new StreamableFile(buffer);
  }

  @Post('bulk-upload/preview')
  @UseGuards(RolesGuard)
  @Roles('Admin')
  @RequirePermission(PermissionModule.SPARE_PART, 'create')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 5 * 1024 * 1024 } }))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: '[Admin only] Validasi file Excel (maks 1000 baris) — tidak menyimpan apa pun' })
  previewBulkUpload(@UploadedFile() file: Express.Multer.File, @Body() dto: BulkUploadSparePartDto) {
    if (!file) throw new BadRequestException('File tidak ditemukan — pastikan field form-data bernama "file"');
    return this.bulkUploadService.preview(file.buffer, file.originalname, dto.mode ?? 'CREATE_ONLY');
  }

  @Post('bulk-upload/commit')
  @UseGuards(RolesGuard)
  @Roles('Admin')
  @RequirePermission(PermissionModule.SPARE_PART, 'create')
  @AuditLog('SparePart')
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 5 * 1024 * 1024 } }))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary:
      '[Admin only] Simpan file yang sama dengan preview — divalidasi ulang, ditolak bila masih ada baris ERROR; semua baris dalam satu transaksi',
  })
  commitBulkUpload(
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: BulkUploadSparePartDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    if (!file) throw new BadRequestException('File tidak ditemukan — pastikan field form-data bernama "file"');
    return this.bulkUploadService.commit(file.buffer, dto.mode ?? 'CREATE_ONLY', user.id);
  }

  @Get('dashboard/summary')
  @RequirePermission(PermissionModule.SPARE_PART, 'view')
  @ApiOperation({ summary: 'Summary card Inventory Dashboard — total item, total stock, low stock, out of stock' })
  getDashboardSummary() {
    return this.sparePartsService.getDashboardSummary();
  }

  @Get('dashboard/charts')
  @RequirePermission(PermissionModule.SPARE_PART, 'view')
  @ApiOperation({ summary: 'Tren Stock In/Out bulanan + daftar low-stock item untuk Inventory Dashboard' })
  @ApiQuery({ name: 'months', required: false, description: 'Rentang trailing bulan (default 6)', example: 6 })
  getDashboardCharts(@Query('months') months?: string) {
    return this.sparePartsService.getDashboardCharts(months ? Number(months) : undefined);
  }

  @Get(':id')
  @RequirePermission(PermissionModule.SPARE_PART, 'view')
  @ApiOperation({ summary: 'Detail satu spare part / material' })
  findOne(@Param('id', ParseUuidPipe) id: string) {
    return this.sparePartsService.findDetail(id);
  }

  @Post()
  @RequirePermission(PermissionModule.SPARE_PART, 'create')
  @AuditLog('SparePart')
  @ApiOperation({ summary: 'Buat spare part / material baru' })
  create(@Body() dto: CreateSparePartDto, @CurrentUser() user: AuthenticatedUser) {
    return this.sparePartsService.create(dto, user.id);
  }

  @Patch(':id')
  @RequirePermission(PermissionModule.SPARE_PART, 'edit')
  @AuditLog('SparePart')
  @ApiOperation({ summary: 'Update spare part / material' })
  update(
    @Param('id', ParseUuidPipe) id: string,
    @Body() dto: UpdateSparePartDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.sparePartsService.update(id, dto, user);
  }

  @Delete(':id')
  @RequirePermission(PermissionModule.SPARE_PART, 'delete')
  @AuditLog('SparePart')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Soft delete spare part / material — ditolak jika masih dipakai' })
  remove(@Param('id', ParseUuidPipe) id: string) {
    return this.sparePartsService.remove(id);
  }

  @Get(':id/stock-movements')
  @RequirePermission(PermissionModule.SPARE_PART, 'view')
  @ApiOperation({ summary: 'Riwayat pergerakan stock (ledger) satu spare part — pagination' })
  listMovements(@Param('id', ParseUuidPipe) id: string, @Query() query: QueryStockMovementDto) {
    return this.sparePartsService.listMovements(id, query);
  }

  // Sengaja TIDAK dipasangi @AuditLog() — endpoint ini sudah punya jejak audit
  // sendiri yang lebih detail lewat StockMovementLedger (siapa/kapan/tipe/
  // quantityDelta/balanceAfter), mencatatnya lagi ke audit_logs generik hanya
  // akan jadi duplikat yang membingungkan. Lihat SparePartsRepository.recordMovement.
  @Post(':id/stock-movements')
  @RequirePermission(PermissionModule.SPARE_PART, 'edit')
  @ApiOperation({ summary: 'Stock In / Stock Out / Adjustment manual — selalu tercatat di ledger' })
  createMovement(
    @Param('id', ParseUuidPipe) id: string,
    @Body() dto: CreateStockMovementDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.sparePartsService.createMovement(id, dto, user.id);
  }
}
