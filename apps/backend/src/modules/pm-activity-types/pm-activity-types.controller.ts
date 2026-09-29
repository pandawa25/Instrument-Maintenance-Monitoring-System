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
import { PmActivityTypesService } from './pm-activity-types.service';
import { CreatePmActivityTypeDto } from './dto/create-pm-activity-type.dto';
import { UpdatePmActivityTypeDto } from './dto/update-pm-activity-type.dto';
import { QueryPmActivityTypeDto } from './dto/query-pm-activity-type.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { ParseUuidPipe } from '../../common/pipes/parse-uuid.pipe';

@ApiTags('PM Activity Types')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('pm-activity-types')
export class PmActivityTypesController {
  constructor(private readonly service: PmActivityTypesService) {}

  @Get()
  @ApiOperation({ summary: 'List PM activity type — search, pagination' })
  findAll(@Query() query: QueryPmActivityTypeDto) {
    return this.service.findAll(query);
  }

  @Get('dropdown')
  @ApiOperation({ summary: 'List PM activity type tanpa pagination — untuk checklist builder PM Program' })
  findAllForDropdown() {
    return this.service.findAllForDropdown();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Detail satu PM activity type' })
  findOne(@Param('id', ParseUuidPipe) id: string) {
    return this.service.findOne(id);
  }

  @Post()
  @Roles('Admin')
  @ApiOperation({ summary: 'Buat PM activity type baru (Admin only)' })
  create(@Body() dto: CreatePmActivityTypeDto) {
    return this.service.create(dto);
  }

  @Patch(':id')
  @Roles('Admin')
  @ApiOperation({ summary: 'Update PM activity type (Admin only)' })
  update(@Param('id', ParseUuidPipe) id: string, @Body() dto: UpdatePmActivityTypeDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @Roles('Admin')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Soft delete PM activity type (Admin only) — ditolak jika masih dipakai checklist item' })
  remove(@Param('id', ParseUuidPipe) id: string) {
    return this.service.remove(id);
  }
}
