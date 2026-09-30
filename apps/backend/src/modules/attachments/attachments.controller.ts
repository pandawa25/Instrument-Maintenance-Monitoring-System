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
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { AuditLog } from '../../common/decorators/audit-log.decorator';
import { ParseUuidPipe } from '../../common/pipes/parse-uuid.pipe';
import { CurrentUser, AuthenticatedUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Attachments')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('attachments')
export class AttachmentsController {
  constructor(private readonly attachmentsService: AttachmentsService) {}

  @Get()
  @ApiOperation({ summary: 'List lampiran milik 1 entity (Corrective Maintenance / PM Period Execution)' })
  findAllForEntity(@Query() query: QueryAttachmentDto) {
    return this.attachmentsService.findAllForEntity(query.entityType, query.entityId);
  }

  @Post('upload')
  @Roles('Admin')
  @AuditLog('Attachment')
  @UseInterceptors(FileInterceptor('file', attachmentMulterOptions))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary:
      'Upload 1 file evidence (foto/PDF, maks 10MB) untuk Corrective Maintenance / PM Period Execution (Admin only)',
  })
  async upload(
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: CreateAttachmentDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    if (!file) {
      throw new BadRequestException('File tidak ditemukan — pastikan field form-data bernama "file"');
    }
    return this.attachmentsService.create(dto.entityType, dto.entityId, file, user.id);
  }

  @Get(':id/file')
  @ApiOperation({ summary: 'Download/preview isi file lampiran' })
  async downloadFile(@Param('id', ParseUuidPipe) id: string, @Res({ passthrough: true }) res: Response) {
    const { stream, fileName, mimeType } = await this.attachmentsService.getFileForDownload(id);
    res.set({
      'Content-Type': mimeType,
      'Content-Disposition': `inline; filename="${encodeURIComponent(fileName)}"`,
    });
    return new StreamableFile(stream);
  }

  @Delete(':id')
  @Roles('Admin')
  @AuditLog('Attachment')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Hapus lampiran (Admin only) — soft delete, file fisik tetap disimpan' })
  remove(@Param('id', ParseUuidPipe) id: string) {
    return this.attachmentsService.remove(id);
  }
}
