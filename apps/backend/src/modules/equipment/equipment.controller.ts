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
import { ApiBearerAuth, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import { PermissionModule } from '@prisma/client';
import type { Response } from 'express';
import { EquipmentService } from './equipment.service';
import { EquipmentBulkUploadService } from './equipment-bulk-upload.service';
import { CreateEquipmentDto } from './dto/create-equipment.dto';
import { UpdateEquipmentDto } from './dto/update-equipment.dto';
import { QueryEquipmentDto } from './dto/query-equipment.dto';
import { ImportPreviewResultDto } from './dto/import-preview-result.dto';
import { QueryImportRowsDto } from './dto/query-import-rows.dto';
import { ImportCommitResultDto } from './dto/import-commit-result.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionGuard } from '../../common/guards/permission.guard';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';
import { AuditLog } from '../../common/decorators/audit-log.decorator';
import { ParseUuidPipe } from '../../common/pipes/parse-uuid.pipe';
import { CurrentUser, AuthenticatedUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Equipment')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionGuard)
@Controller('equipment')
export class EquipmentController {
  constructor(
    private readonly equipmentService: EquipmentService,
    private readonly bulkUploadService: EquipmentBulkUploadService,
  ) {}

  @Get()
  @RequirePermission(PermissionModule.EQUIPMENT, 'view')
  @ApiOperation({ summary: 'List equipment — search, filter area/instrument name/status, pagination' })
  findAll(@Query() query: QueryEquipmentDto) {
    return this.equipmentService.findAll(query);
  }

  @Get('bulk-upload/template')
  @RequirePermission(PermissionModule.EQUIPMENT, 'create')
  @ApiOperation({ summary: 'Download template Excel untuk bulk upload equipment' })
  async downloadBulkUploadTemplate(@Res({ passthrough: true }) res: Response) {
    const buffer = await this.bulkUploadService.generateTemplate();
    res.set({
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': 'attachment; filename="equipment-bulk-upload-template.xlsx"',
    });
    return new StreamableFile(buffer);
  }

  @Post('bulk-upload/preview')
  @RequirePermission(PermissionModule.EQUIPMENT, 'create')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 5 * 1024 * 1024 } }))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary:
      'Tahap 1: upload & validasi file Excel (create-only, maks 1000 baris) — belum menyimpan apa pun ke equipment. ' +
      'Lihat ringkasan hasilnya, lalu commit lewat POST bulk-upload/:batchId/commit',
  })
  async previewBulk(
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<ImportPreviewResultDto> {
    if (!file) {
      throw new BadRequestException('File tidak ditemukan — pastikan field form-data bernama "file"');
    }
    return this.bulkUploadService.previewUpload(file.buffer, file.originalname, user.id);
  }

  @Get('bulk-upload/:batchId')
  @RequirePermission(PermissionModule.EQUIPMENT, 'create')
  @ApiOperation({ summary: 'Ringkasan satu batch import (status, jumlah OK/warning/error)' })
  getBulkBatch(@Param('batchId', ParseUuidPipe) batchId: string) {
    return this.bulkUploadService.getBatch(batchId);
  }

  @Get('bulk-upload/:batchId/rows')
  @RequirePermission(PermissionModule.EQUIPMENT, 'create')
  @ApiOperation({ summary: 'Daftar baris satu batch import, bisa difilter per severity' })
  listBulkBatchRows(@Param('batchId', ParseUuidPipe) batchId: string, @Query() query: QueryImportRowsDto) {
    return this.bulkUploadService.listRows(batchId, query);
  }

  @Post('bulk-upload/:batchId/commit')
  @RequirePermission(PermissionModule.EQUIPMENT, 'create')
  @AuditLog('Equipment')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'Tahap 2: commit batch yang sudah di-preview — insert semua baris OK+WARNING dalam satu transaksi. ' +
      'Ditolak kalau masih ada baris ERROR',
  })
  commitBulk(@Param('batchId', ParseUuidPipe) batchId: string): Promise<ImportCommitResultDto> {
    return this.bulkUploadService.commitBatch(batchId);
  }

  @Get('dropdown')
  @RequirePermission(PermissionModule.EQUIPMENT, 'view')
  @ApiOperation({ summary: 'Dropdown ringan semua equipment aktif (tanpa batas limit paginasi) — mis. multi-select PM Program' })
  findAllForDropdown() {
    return this.equipmentService.findAllForDropdown();
  }

  // NOTE: path statis (dashboard/*, export, manufacturers) WAJIB didaftarkan sebelum
  // ":id" di bawah — kalau tidak, Nest akan menganggap "dashboard"/"export" sebagai value :id.

  @Get('dashboard/status-counts')
  @RequirePermission(PermissionModule.EQUIPMENT, 'view')
  @ApiOperation({ summary: 'Count per status (Total/Active/Standby/Out Of Service) untuk summary card' })
  getStatusCounts(@Query() query: QueryEquipmentDto) {
    return this.equipmentService.getStatusCounts(query);
  }

  @Get('manufacturers')
  @RequirePermission(PermissionModule.EQUIPMENT, 'view')
  @ApiOperation({ summary: 'Daftar distinct manufacturer (non-null) untuk dropdown filter' })
  getManufacturers() {
    return this.equipmentService.getManufacturers();
  }

  @Get('export')
  @RequirePermission(PermissionModule.EQUIPMENT, 'view')
  @ApiOperation({ summary: 'Export Excel data equipment sesuai filter yang aktif' })
  async exportExcel(@Query() query: QueryEquipmentDto, @Res({ passthrough: true }) res: Response) {
    const buffer = await this.equipmentService.exportToExcel(query);
    res.set({
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="equipment-${new Date().toISOString().slice(0, 10)}.xlsx"`,
    });
    return new StreamableFile(buffer);
  }

  @Get(':id')
  @RequirePermission(PermissionModule.EQUIPMENT, 'view')
  @ApiOperation({ summary: 'Detail satu equipment' })
  findOne(@Param('id', ParseUuidPipe) id: string) {
    return this.equipmentService.findOne(id);
  }

  @Post()
  @RequirePermission(PermissionModule.EQUIPMENT, 'create')
  @AuditLog('Equipment')
  @ApiOperation({ summary: 'Buat equipment baru' })
  create(@Body() dto: CreateEquipmentDto) {
    return this.equipmentService.create(dto);
  }

  @Patch(':id')
  @RequirePermission(PermissionModule.EQUIPMENT, 'edit')
  @AuditLog('Equipment')
  @ApiOperation({ summary: 'Update equipment' })
  update(@Param('id', ParseUuidPipe) id: string, @Body() dto: UpdateEquipmentDto) {
    return this.equipmentService.update(id, dto);
  }

  @Delete(':id')
  @RequirePermission(PermissionModule.EQUIPMENT, 'delete')
  @AuditLog('Equipment')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Soft delete equipment — ditolak jika masih ada riwayat maintenance',
  })
  remove(@Param('id', ParseUuidPipe) id: string) {
    return this.equipmentService.remove(id);
  }
}
