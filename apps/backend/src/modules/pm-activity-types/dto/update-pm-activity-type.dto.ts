import { PartialType } from '@nestjs/swagger';
import { CreatePmActivityTypeDto } from './create-pm-activity-type.dto';

export class UpdatePmActivityTypeDto extends PartialType(CreatePmActivityTypeDto) {}
