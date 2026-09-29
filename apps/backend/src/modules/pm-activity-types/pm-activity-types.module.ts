import { Module } from '@nestjs/common';
import { PmActivityTypesController } from './pm-activity-types.controller';
import { PmActivityTypesService } from './pm-activity-types.service';
import { PmActivityTypesRepository } from './pm-activity-types.repository';

@Module({
  controllers: [PmActivityTypesController],
  providers: [PmActivityTypesService, PmActivityTypesRepository],
  exports: [PmActivityTypesService], // dipakai module PM Program untuk validasi activity_type_id
})
export class PmActivityTypesModule {}
