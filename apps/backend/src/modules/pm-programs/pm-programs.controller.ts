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
import { PmProgramsService } from './pm-programs.service';
import { CreatePmProgramDto } from './dto/create-pm-program.dto';
import { UpdatePmProgramDto } from './dto/update-pm-program.dto';
import { QueryPmProgramDto } from './dto/query-pm-program.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { ParseUuidPipe } from '../../common/pipes/parse-uuid.pipe';

@ApiTags('PM Programs')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('pm-programs')
export class PmProgramsController {
  constructor(private readonly service: PmProgramsService) {}

  @Get()
  @ApiOperation({ summary: 'List PM Program — search, filter vendor/equipment/status, pagination' })
  findAll(@Query() query: QueryPmProgramDto) {
    return this.service.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Detail PM Program — termasuk daftar equipment & checklist item' })
  findOne(@Param('id', ParseUuidPipe) id: string) {
    return this.service.findOne(id);
  }

  @Post()
  @Roles('Admin')
  @ApiOperation({ summary: 'Buat PM Program baru (Admin only)' })
  create(@Body() dto: CreatePmProgramDto) {
    return this.service.create(dto);
  }

  @Patch(':id')
  @Roles('Admin')
  @ApiOperation({ summary: 'Update PM Program — equipment & checklist item di-replace seluruhnya (Admin only)' })
  update(@Param('id', ParseUuidPipe) id: string, @Body() dto: UpdatePmProgramDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @Roles('Admin')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Soft delete PM Program (Admin only) — ditolak jika sudah ada periode' })
  remove(@Param('id', ParseUuidPipe) id: string) {
    return this.service.remove(id);
  }
}
