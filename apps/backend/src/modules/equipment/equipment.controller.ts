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
import type { Response } from 'express';
import { EquipmentService } from './equipment.service';
import { EquipmentBulkUploadService } from './equipment-bulk-upload.service';
import { CreateEquipmentDto } from './dto/create-equipment.dto';
import { UpdateEquipmentDto } from './dto/update-equipment.dto';
import { QueryEquipmentDto } from './dto/query-equipment.dto';
import { BulkUploadResultDto } from './dto/bulk-upload-result.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { ParseUuidPipe } from '../../common/pipes/parse-uuid.pipe';

@ApiTags('Equipment')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('equipment')
export class EquipmentController {
  constructor(
    private readonly equipmentService: EquipmentService,
    private readonly bulkUploadService: EquipmentBulkUploadService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'List equipment — search, filter area/instrument name/status, pagination' })
  findAll(@Query() query: QueryEquipmentDto) {
    return this.equipmentService.findAll(query);
  }

  @Get('bulk-upload/template')
  @Roles('Admin')
  @ApiOperation({ summary: 'Download template Excel untuk bulk upload equipment (Admin only)' })
  async downloadBulkUploadTemplate(@Res({ passthrough: true }) res: Response) {
    const buffer = await this.bulkUploadService.generateTemplate();
    res.set({
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': 'attachment; filename="equipment-bulk-upload-template.xlsx"',
    });
    return new StreamableFile(buffer);
  }

  @Post('bulk-upload')
  @Roles('Admin')
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary: 'Upload file Excel untuk create/update equipment secara massal — upsert by Tag Number (Admin only)',
  })
  async uploadBulk(@UploadedFile() file: Express.Multer.File): Promise<BulkUploadResultDto> {
    if (!file) {
      throw new BadRequestException('File tidak ditemukan — pastikan field form-data bernama "file"');
    }
    return this.bulkUploadService.processUpload(file.buffer);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Detail satu equipment' })
  findOne(@Param('id', ParseUuidPipe) id: string) {
    return this.equipmentService.findOne(id);
  }

  @Post()
  @Roles('Admin')
  @ApiOperation({ summary: 'Buat equipment baru (Admin only)' })
  create(@Body() dto: CreateEquipmentDto) {
    return this.equipmentService.create(dto);
  }

  @Patch(':id')
  @Roles('Admin')
  @ApiOperation({ summary: 'Update equipment (Admin only)' })
  update(@Param('id', ParseUuidPipe) id: string, @Body() dto: UpdateEquipmentDto) {
    return this.equipmentService.update(id, dto);
  }

  @Delete(':id')
  @Roles('Admin')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Soft delete equipment (Admin only) — ditolak jika masih ada riwayat maintenance',
  })
  remove(@Param('id', ParseUuidPipe) id: string) {
    return this.equipmentService.remove(id);
  }
}
