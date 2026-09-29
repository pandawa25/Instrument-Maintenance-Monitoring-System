import { Module } from '@nestjs/common';
import { PmProgramsController } from './pm-programs.controller';
import { PmProgramsService } from './pm-programs.service';
import { PmProgramsRepository } from './pm-programs.repository';
import { VendorsModule } from '../vendors/vendors.module';
import { EquipmentModule } from '../equipment/equipment.module';
import { PmActivityTypesModule } from '../pm-activity-types/pm-activity-types.module';

@Module({
  imports: [VendorsModule, EquipmentModule, PmActivityTypesModule],
  controllers: [PmProgramsController],
  providers: [PmProgramsService, PmProgramsRepository],
  exports: [PmProgramsService], // dipakai module PM Period untuk validasi pm_program_id
})
export class PmProgramsModule {}
