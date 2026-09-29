import { PartialType } from '@nestjs/swagger';
import { CreatePmProgramDto } from './create-pm-program.dto';

export class UpdatePmProgramDto extends PartialType(CreatePmProgramDto) {}
