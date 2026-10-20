import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
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
import { AttachmentsService } from './attachments.service';
import { CreateAttachmentDto } from './dto/create-attachment.dto';
import { QueryAttachmentDto } from './dto/query-attachment.dto';
import { attachmentMulterOptions } from './attachments.multer.config';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { AuditLog } from '../../common/decorators/audit-log.decorator';
import { ParseUuidPipe } from '../../common/pipes/parse-uuid.pipe';
import { CurrentUser, AuthenticatedUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Attachments')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('attachments')
export class AttachmentsController {
  constructor(private readonly attachmentsService: AttachmentsService) {}

  @Get()
  @ApiOperation({ summary: 'List lampiran milik 1 entity (Corrective Maintenance / PM Period Execution / Equipment)' })
  findAllForEntity(@Query() query: QueryAttachmentDto, @CurrentUser() user: AuthenticatedUser) {
    return this.attachmentsService.findAllForEntity(user, query.entityType, query.entityId);
  }

  // Hak akses upload/hapus/lihat ditentukan per jenis entity di AttachmentsService.assertAccess
  // (EQUIPMENT: permission modul Equipment; evidence CM/PM: Admin only seperti sebelumnya).
  @Post('upload')
  @AuditLog('Attachment')
  @UseInterceptors(FileInterceptor('file', attachmentMulterOptions))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary:
      'Upload 1 file (foto/PDF, maks 10MB): evidence Corrective Maintenance / PM Period Execution (Admin only) atau foto/datasheet Equipment (hak EQUIPMENT edit)',
  })
  async upload(
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: CreateAttachmentDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    if (!file) {
      throw new BadRequestException('File tidak ditemukan — pastikan field form-data bernama "file"');
    }
    return this.attachmentsService.create(user, dto.entityType, dto.entityId, file);
  }

  @Get(':id/file')
  @ApiOperation({ summary: 'Download/preview isi file lampiran' })
  async downloadFile(
    @Param('id', ParseUuidPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { stream, fileName, mimeType } = await this.attachmentsService.getFileForDownload(user, id);
    res.set({
      'Content-Type': mimeType,
      'Content-Disposition': `inline; filename="${encodeURIComponent(fileName)}"`,
    });
    return new StreamableFile(stream);
  }

  @Delete(':id')
  @AuditLog('Attachment')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Hapus lampiran — soft delete, file fisik tetap disimpan (hak akses mengikuti jenis entity)' })
  remove(@Param('id', ParseUuidPipe) id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.attachmentsService.remove(user, id);
  }
}
