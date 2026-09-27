import { Module } from '@nestjs/common';
import { InstrumentsController } from './instruments.controller';
import { InstrumentsService } from './instruments.service';
import { InstrumentsRepository } from './instruments.repository';
import { AreasModule } from '../areas/areas.module';
import { InstrumentTypesModule } from '../instrument-types/instrument-types.module';

@Module({
  imports: [AreasModule, InstrumentTypesModule], // dipakai untuk validasi areaId & instrumentTypeId
  controllers: [InstrumentsController],
  providers: [InstrumentsService, InstrumentsRepository],
  exports: [InstrumentsService], // dipakai module Corrective Maintenance nanti untuk validasi instrument_id
})
export class InstrumentsModule {}
