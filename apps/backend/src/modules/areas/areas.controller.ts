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
import { AreasService } from './areas.service';
import { CreateAreaDto } from './dto/create-area.dto';
import { UpdateAreaDto } from './dto/update-area.dto';
import { QueryAreaDto } from './dto/query-area.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { AuditLog } from '../../common/decorators/audit-log.decorator';
import { ParseUuidPipe } from '../../common/pipes/parse-uuid.pipe';

@ApiTags('Areas')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('areas')
export class AreasController {
  constructor(private readonly areasService: AreasService) {}

  @Get()
  @ApiOperation({ summary: 'List area — search, filter status, pagination' })
  findAll(@Query() query: QueryAreaDto) {
    return this.areasService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Detail satu area' })
  findOne(@Param('id', ParseUuidPipe) id: string) {
    return this.areasService.findOne(id);
  }

  @Post()
  @Roles('Admin')
  @AuditLog('Area')
  @ApiOperation({ summary: 'Buat area baru (Admin only)' })
  create(@Body() dto: CreateAreaDto) {
    return this.areasService.create(dto);
  }

  @Patch(':id')
  @Roles('Admin')
  @AuditLog('Area')
  @ApiOperation({ summary: 'Update area (Admin only)' })
  update(@Param('id', ParseUuidPipe) id: string, @Body() dto: UpdateAreaDto) {
    return this.areasService.update(id, dto);
  }

  @Delete(':id')
  @Roles('Admin')
  @AuditLog('Area')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Soft delete area (Admin only) — ditolak jika masih ada equipment aktif' })
  remove(@Param('id', ParseUuidPipe) id: string) {
    return this.areasService.remove(id);
  }
}
