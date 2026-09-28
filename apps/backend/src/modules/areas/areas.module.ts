import { Module } from '@nestjs/common';
import { AreasController } from './areas.controller';
import { AreasService } from './areas.service';
import { AreasRepository } from './areas.repository';

@Module({
  controllers: [AreasController],
  providers: [AreasService, AreasRepository],
  exports: [AreasService], // dipakai module Equipment untuk validasi area_id
})
export class AreasModule {}
