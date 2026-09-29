import { Module } from '@nestjs/common';
import { PmPeriodsController } from './pm-periods.controller';
import { PmPeriodController } from './pm-period.controller';
import { PmPeriodExecutionsController } from './pm-period-executions.controller';
import { PmPeriodsService } from './pm-periods.service';
import { PmPeriodExecutionsService } from './pm-period-executions.service';
import { PmPeriodsRepository } from './pm-periods.repository';
import { PmPeriodExecutionsRepository } from './pm-period-executions.repository';
import { PmProgramsModule } from '../pm-programs/pm-programs.module';

@Module({
  imports: [PmProgramsModule],
  controllers: [PmPeriodsController, PmPeriodController, PmPeriodExecutionsController],
  providers: [PmPeriodsService, PmPeriodExecutionsService, PmPeriodsRepository, PmPeriodExecutionsRepository],
})
export class PmPeriodsModule {}
