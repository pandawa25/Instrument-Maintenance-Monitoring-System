import { Module } from '@nestjs/common';
import { SparePartsController } from './spare-parts.controller';
import { SparePartsService } from './spare-parts.service';
import { SparePartsRepository } from './spare-parts.repository';

@Module({
  controllers: [SparePartsController],
  providers: [SparePartsService, SparePartsRepository],
  // SparePartsService dipakai module Maintenance untuk validasi spare_part_id;
  // SparePartsRepository dipakai untuk recordMovement() (ledger) saat CM
  // create/update/delete, supaya perubahan stock ikut 1 transaction dengan CM.
  exports: [SparePartsService, SparePartsRepository],
})
export class SparePartsModule {}
