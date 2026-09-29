import { PartialType } from '@nestjs/swagger';
import { CreatePmPeriodDto } from './create-pm-period.dto';

export class UpdatePmPeriodDto extends PartialType(CreatePmPeriodDto) {}
