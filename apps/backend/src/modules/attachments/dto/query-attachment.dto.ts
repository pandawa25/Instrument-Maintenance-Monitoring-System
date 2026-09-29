import { ApiProperty } from '@nestjs/swagger';
import { AttachmentEntityType } from '@prisma/client';
import { IsEnum, IsUUID } from 'class-validator';

export class QueryAttachmentDto {
  @ApiProperty({ enum: AttachmentEntityType })
  @IsEnum(AttachmentEntityType)
  entityType!: AttachmentEntityType;

  @ApiProperty()
  @IsUUID()
  entityId!: string;
}
