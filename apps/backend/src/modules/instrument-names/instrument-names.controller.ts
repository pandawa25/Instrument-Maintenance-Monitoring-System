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
import { PermissionModule } from '@prisma/client';
import { InstrumentNamesService } from './instrument-names.service';
import { CreateInstrumentNameDto } from './dto/create-instrument-name.dto';
import { UpdateInstrumentNameDto } from './dto/update-instrument-name.dto';
import { QueryInstrumentNameDto } from './dto/query-instrument-name.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionGuard } from '../../common/guards/permission.guard';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';
import { AuditLog } from '../../common/decorators/audit-log.decorator';
import { ParseUuidPipe } from '../../common/pipes/parse-uuid.pipe';

@ApiTags('Instrument Names')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionGuard)
@Controller('instrument-names')
export class InstrumentNamesController {
  constructor(private readonly instrumentNamesService: InstrumentNamesService) {}

  @Get()
  @RequirePermission(PermissionModule.INSTRUMENT_NAME, 'view')
  @ApiOperation({ summary: 'List master Instrument Name — search, pagination' })
  findAll(@Query() query: QueryInstrumentNameDto) {
    return this.instrumentNamesService.findAll(query);
  }

  @Get('dropdown')
  @RequirePermission(PermissionModule.INSTRUMENT_NAME, 'view')
  @ApiOperation({ summary: 'List semua Instrument Name aktif (untuk dropdown) — tanpa pagination' })
  findAllForDropdown() {
    return this.instrumentNamesService.findAllForDropdown();
  }

  @Get(':id')
  @RequirePermission(PermissionModule.INSTRUMENT_NAME, 'view')
  @ApiOperation({ summary: 'Detail satu Instrument Name' })
  findOne(@Param('id', ParseUuidPipe) id: string) {
    return this.instrumentNamesService.findOne(id);
  }

  @Post()
  @RequirePermission(PermissionModule.INSTRUMENT_NAME, 'create')
  @AuditLog('InstrumentName')
  @ApiOperation({ summary: 'Buat Instrument Name baru' })
  create(@Body() dto: CreateInstrumentNameDto) {
    return this.instrumentNamesService.create(dto);
  }

  @Patch(':id')
  @RequirePermission(PermissionModule.INSTRUMENT_NAME, 'edit')
  @AuditLog('InstrumentName')
  @ApiOperation({ summary: 'Update Instrument Name' })
  update(@Param('id', ParseUuidPipe) id: string, @Body() dto: UpdateInstrumentNameDto) {
    return this.instrumentNamesService.update(id, dto);
  }

  @Delete(':id')
  @RequirePermission(PermissionModule.INSTRUMENT_NAME, 'delete')
  @AuditLog('InstrumentName')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Soft delete Instrument Name — ditolak jika masih dipakai equipment aktif',
  })
  remove(@Param('id', ParseUuidPipe) id: string) {
    return this.instrumentNamesService.remove(id);
  }
}
