import { ApiProperty } from '@nestjs/swagger';
import { AttachmentEntityType } from '@prisma/client';
import { IsEnum, IsUUID } from 'class-validator';

// Field ini datang sebagai text field multipart (bareng file-nya di field
// terpisah bernama "file") — bukan JSON body biasa.
export class CreateAttachmentDto {
  @ApiProperty({ enum: AttachmentEntityType })
  @IsEnum(AttachmentEntityType)
  entityType!: AttachmentEntityType;

  @ApiProperty({ example: 'uuid milik Corrective Maintenance / PM Period Execution' })
  @IsUUID()
  entityId!: string;
}
