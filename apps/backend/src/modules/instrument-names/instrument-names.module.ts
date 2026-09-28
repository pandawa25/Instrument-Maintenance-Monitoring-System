import { Module } from '@nestjs/common';
import { InstrumentNamesController } from './instrument-names.controller';
import { InstrumentNamesService } from './instrument-names.service';
import { InstrumentNamesRepository } from './instrument-names.repository';

@Module({
  controllers: [InstrumentNamesController],
  providers: [InstrumentNamesService, InstrumentNamesRepository],
  exports: [InstrumentNamesService], // dipakai module Equipment untuk validasi instrument_name_id
})
export class InstrumentNamesModule {}
