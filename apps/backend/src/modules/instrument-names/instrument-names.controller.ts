import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { InstrumentNamesService } from './instrument-names.service';
import { CreateInstrumentNameDto } from './dto/create-instrument-name.dto';
import { UpdateInstrumentNameDto } from './dto/update-instrument-name.dto';
import { QueryInstrumentNameDto } from './dto/query-instrument-name.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { ParseUuidPipe } from '../../common/pipes/parse-uuid.pipe';

@ApiTags('Instrument Names')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('instrument-names')
export class InstrumentNamesController {
  constructor(private readonly instrumentNamesService: InstrumentNamesService) {}

  @Get()
  @ApiOperation({ summary: 'List master Instrument Name — search, pagination' })
  findAll(@Query() query: QueryInstrumentNameDto) {
    return this.instrumentNamesService.findAll(query);
  }

  @Get('dropdown')
  @ApiOperation({ summary: 'List semua Instrument Name aktif (untuk dropdown) — tanpa pagination' })
  findAllForDropdown() {
    return this.instrumentNamesService.findAllForDropdown();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Detail satu Instrument Name' })
  findOne(@Param('id', ParseUuidPipe) id: string) {
    return this.instrumentNamesService.findOne(id);
  }

  @Post()
  @Roles('Admin')
  @ApiOperation({ summary: 'Buat Instrument Name baru (Admin only)' })
  create(@Body() dto: CreateInstrumentNameDto) {
    return this.instrumentNamesService.create(dto);
  }

  @Patch(':id')
  @Roles('Admin')
  @ApiOperation({ summary: 'Update Instrument Name (Admin only)' })
  update(@Param('id', ParseUuidPipe) id: string, @Body() dto: UpdateInstrumentNameDto) {
    return this.instrumentNamesService.update(id, dto);
  }

  @Delete(':id')
  @Roles('Admin')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Soft delete Instrument Name (Admin only) — ditolak jika masih dipakai equipment aktif',
  })
  remove(@Param('id', ParseUuidPipe) id: string) {
    return this.instrumentNamesService.remove(id);
  }
}
