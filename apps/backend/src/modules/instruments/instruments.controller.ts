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
import { InstrumentsService } from './instruments.service';
import { CreateInstrumentDto } from './dto/create-instrument.dto';
import { UpdateInstrumentDto } from './dto/update-instrument.dto';
import { QueryInstrumentDto } from './dto/query-instrument.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { ParseUuidPipe } from '../../common/pipes/parse-uuid.pipe';

@ApiTags('Instruments')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('instruments')
export class InstrumentsController {
  constructor(private readonly instrumentsService: InstrumentsService) {}

  @Get()
  @ApiOperation({ summary: 'List instrument — search, filter area/type/status, pagination' })
  findAll(@Query() query: QueryInstrumentDto) {
    return this.instrumentsService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Detail satu instrument' })
  findOne(@Param('id', ParseUuidPipe) id: string) {
    return this.instrumentsService.findOne(id);
  }

  @Post()
  @Roles('Admin')
  @ApiOperation({ summary: 'Buat instrument baru (Admin only)' })
  create(@Body() dto: CreateInstrumentDto) {
    return this.instrumentsService.create(dto);
  }

  @Patch(':id')
  @Roles('Admin')
  @ApiOperation({ summary: 'Update instrument (Admin only)' })
  update(@Param('id', ParseUuidPipe) id: string, @Body() dto: UpdateInstrumentDto) {
    return this.instrumentsService.update(id, dto);
  }

  @Delete(':id')
  @Roles('Admin')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Soft delete instrument (Admin only) — ditolak jika masih ada riwayat maintenance',
  })
  remove(@Param('id', ParseUuidPipe) id: string) {
    return this.instrumentsService.remove(id);
  }
}
