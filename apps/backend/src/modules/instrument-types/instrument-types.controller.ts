import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { InstrumentTypesService } from './instrument-types.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@ApiTags('Instrument Types')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('instrument-types')
export class InstrumentTypesController {
  constructor(private readonly instrumentTypesService: InstrumentTypesService) {}

  @Get()
  @ApiOperation({ summary: 'List semua instrument type aktif (untuk dropdown) — tanpa pagination' })
  findAll() {
    return this.instrumentTypesService.findAll();
  }
}
