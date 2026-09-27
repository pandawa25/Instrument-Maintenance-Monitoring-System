import { PartialType } from '@nestjs/swagger';
import { CreateAreaDto } from './create-area.dto';

// PUT /areas/:id menerima semua field CreateAreaDto secara opsional.
export class UpdateAreaDto extends PartialType(CreateAreaDto) {}
