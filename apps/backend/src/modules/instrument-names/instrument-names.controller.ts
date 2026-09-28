import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { InstrumentNamesService } from './instrument-names.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@ApiTags('Instrument Names')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('instrument-names')
export class InstrumentNamesController {
  constructor(private readonly instrumentNamesService: InstrumentNamesService) {}

  @Get()
  @ApiOperation({ summary: 'List semua master Instrument Name aktif (untuk dropdown) — tanpa pagination' })
  findAll() {
    return this.instrumentNamesService.findAll();
  }
}
