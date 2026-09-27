import { PartialType } from '@nestjs/swagger';
import { CreateInstrumentDto } from './create-instrument.dto';

// PATCH /instruments/:id menerima semua field CreateInstrumentDto secara opsional.
export class UpdateInstrumentDto extends PartialType(CreateInstrumentDto) {}
