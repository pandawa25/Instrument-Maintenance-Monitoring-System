import { Module } from '@nestjs/common';
import { InstrumentTypesController } from './instrument-types.controller';
import { InstrumentTypesService } from './instrument-types.service';
import { InstrumentTypesRepository } from './instrument-types.repository';

@Module({
  controllers: [InstrumentTypesController],
  providers: [InstrumentTypesService, InstrumentTypesRepository],
  exports: [InstrumentTypesService], // dipakai module Instrument untuk validasi instrument_type_id
})
export class InstrumentTypesModule {}
