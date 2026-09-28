import { PartialType } from '@nestjs/swagger';
import { CreateInstrumentNameDto } from './create-instrument-name.dto';

// PATCH /instrument-names/:id menerima semua field CreateInstrumentNameDto secara opsional.
export class UpdateInstrumentNameDto extends PartialType(CreateInstrumentNameDto) {}
