import { Module } from '@nestjs/common';
import { SparePartsController } from './spare-parts.controller';
import { SparePartsService } from './spare-parts.service';
import { SparePartsRepository } from './spare-parts.repository';

@Module({
  controllers: [SparePartsController],
  providers: [SparePartsService, SparePartsRepository],
  exports: [SparePartsService], // dipakai module Maintenance untuk validasi spare_part_id
})
export class SparePartsModule {}
