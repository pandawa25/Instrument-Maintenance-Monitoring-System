import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import { PermissionModule } from '@prisma/client';
import { WorkOrdersService } from './work-orders.service';
import { WorkOrderImportService } from './work-order-import.service';
import { QueryWorkOrderDto } from './dto/query-work-order.dto';
import { RelinkEquipmentDto } from './dto/relink-equipment.dto';
import { QueryImportRowsDto } from './dto/query-import-rows.dto';
import { WoImportPreviewResultDto } from './dto/wo-import-preview-result.dto';
import { WoImportCommitResultDto } from './dto/wo-import-commit-result.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionGuard } from '../../common/guards/permission.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { AuditLog } from '../../common/decorators/audit-log.decorator';
import { ParseUuidPipe } from '../../common/pipes/parse-uuid.pipe';
import { CurrentUser, AuthenticatedUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Work Order & Notification')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionGuard)
@Controller('work-orders')
export class WorkOrdersController {
  constructor(
    private readonly service: WorkOrdersService,
    private readonly importService: WorkOrderImportService,
  ) {}

  @Get()
  @RequirePermission(PermissionModule.WORK_ORDER, 'view')
  @ApiOperation({ summary: 'List Work Order — filter equipment/area/orderType/lifecycleStage/tanggal, pagination' })
  findAll(@Query() query: QueryWorkOrderDto) {
    return this.service.findAll(query);
  }

  @Get('stage-counts')
  @RequirePermission(PermissionModule.WORK_ORDER, 'view')
  @ApiOperation({ summary: 'Jumlah per tahap siklus (CREATED/RELEASED/TECHNICALLY_COMPLETED/CLOSED) untuk stepper di atas list' })
  getStageCounts(@Query() query: QueryWorkOrderDto) {
    return this.service.getStageCounts(query);
  }

  // Path statis WAJIB didaftarkan sebelum ":id" di bawah — sama catatannya seperti di
  // EquipmentController (kalau tidak, Nest menganggap "unmatched"/"dropdown" sebagai value :id).

  @Get('unmatched')
  @RequirePermission(PermissionModule.WORK_ORDER, 'view')
  @ApiOperation({ summary: '"Antrian Belum Terhubung" — Work Order yang equipmentId-nya belum ter-link' })
  findUnmatched(@Query() query: QueryWorkOrderDto) {
    // `skip` di QueryWorkOrderDto adalah getter (dihitung dari page/limit) — spread object
    // TIDAK ikut menyalin getter dari prototype, jadi harus disertakan eksplisit di sini.
    return this.service.findAll({ ...query, unmatchedOnly: true, skip: query.skip });
  }

  @Get('dropdown')
  @RequirePermission(PermissionModule.WORK_ORDER, 'view')
  @ApiOperation({ summary: 'Dropdown ringan Work Order milik satu equipment — dipakai field link di form Corrective Maintenance' })
  findDropdownByEquipment(@Query('equipmentId', ParseUuidPipe) equipmentId: string) {
    return this.service.findDropdownByEquipment(equipmentId);
  }

  @Get('order-types')
  @RequirePermission(PermissionModule.WORK_ORDER, 'view')
  @ApiOperation({ summary: 'Daftar distinct Order Type (non-null) dari data yang sudah ter-import, untuk dropdown filter' })
  getOrderTypes() {
    return this.service.getOrderTypes();
  }

  // Import bulk: SENGAJA dikunci @Roles('Admin') (statis) DI ATAS permission WORK_ORDER
  // 'create' — pola sama persis dengan Bulk Upload Spare Part (lihat SparePartsController),
  // data yang masuk berdampak ke banyak equipment sekaligus & berasal dari sistem eksternal (ERP).

  @Post('import/preview')
  @UseGuards(RolesGuard)
  @Roles('Admin')
  @RequirePermission(PermissionModule.WORK_ORDER, 'create')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 5 * 1024 * 1024 } }))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary:
      'Tahap 1: upload & validasi export SAP PM (36 kolom, maks 1000 baris) — belum menyimpan apa pun. ' +
      'Deteksi kolom otomatis dari header row. Lihat ringkasan hasilnya, lalu commit lewat POST import/:batchId/commit',
  })
  async previewImport(
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<WoImportPreviewResultDto> {
    if (!file) {
      throw new BadRequestException('File tidak ditemukan — pastikan field form-data bernama "file"');
    }
    return this.importService.previewUpload(file.buffer, file.originalname, user.id);
  }

  @Get('import/:batchId')
  @UseGuards(RolesGuard)
  @Roles('Admin')
  @RequirePermission(PermissionModule.WORK_ORDER, 'create')
  @ApiOperation({ summary: 'Ringkasan satu batch import (status, jumlah OK/warning/error)' })
  getImportBatch(@Param('batchId', ParseUuidPipe) batchId: string) {
    return this.importService.getBatch(batchId);
  }

  @Get('import/:batchId/rows')
  @UseGuards(RolesGuard)
  @Roles('Admin')
  @RequirePermission(PermissionModule.WORK_ORDER, 'create')
  @ApiOperation({ summary: 'Daftar baris satu batch import, bisa difilter per severity' })
  listImportRows(@Param('batchId', ParseUuidPipe) batchId: string, @Query() query: QueryImportRowsDto) {
    return this.importService.listRows(batchId, query);
  }

  @Post('import/:batchId/commit')
  @UseGuards(RolesGuard)
  @Roles('Admin')
  @RequirePermission(PermissionModule.WORK_ORDER, 'create')
  @AuditLog('WorkOrder')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'Tahap 2: commit batch yang sudah di-preview — upsert Notification (by notificationNo) + Work Order ' +
      '(by orderNo) untuk semua baris OK+WARNING dalam satu transaksi. Ditolak kalau masih ada baris ERROR',
  })
  commitImport(
    @Param('batchId', ParseUuidPipe) batchId: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<WoImportCommitResultDto> {
    return this.importService.commitBatch(batchId, user.id);
  }

  @Get(':id')
  @RequirePermission(PermissionModule.WORK_ORDER, 'view')
  @ApiOperation({ summary: 'Detail satu Work Order (+ Notification terkait, stepper, link Corrective Maintenance)' })
  findOne(@Param('id', ParseUuidPipe) id: string) {
    return this.service.findOne(id);
  }

  @Patch(':id/equipment-link')
  @RequirePermission(PermissionModule.WORK_ORDER, 'edit')
  @AuditLog('WorkOrder')
  @ApiOperation({
    summary:
      'Hubungkan/lepas equipment secara manual — satu-satunya field ERP yang boleh diedit lewat API ' +
      '(field lain read-only, sumbernya import). Dipakai dari "Antrian Belum Terhubung"',
  })
  relinkEquipment(@Param('id', ParseUuidPipe) id: string, @Body() dto: RelinkEquipmentDto) {
    return this.service.relinkEquipment(id, dto);
  }
}
