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
import { AreasService } from './areas.service';
import { CreateAreaDto } from './dto/create-area.dto';
import { UpdateAreaDto } from './dto/update-area.dto';
import { QueryAreaDto } from './dto/query-area.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionGuard } from '../../common/guards/permission.guard';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';
import { AuditLog } from '../../common/decorators/audit-log.decorator';
import { ParseUuidPipe } from '../../common/pipes/parse-uuid.pipe';

@ApiTags('Areas')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionGuard)
@Controller('areas')
export class AreasController {
  constructor(private readonly areasService: AreasService) {}

  @Get()
  @RequirePermission(PermissionModule.AREA, 'view')
  @ApiOperation({ summary: 'List area — search, filter status, pagination' })
  findAll(@Query() query: QueryAreaDto) {
    return this.areasService.findAll(query);
  }

  @Get(':id')
  @RequirePermission(PermissionModule.AREA, 'view')
  @ApiOperation({ summary: 'Detail satu area' })
  findOne(@Param('id', ParseUuidPipe) id: string) {
    return this.areasService.findOne(id);
  }

  @Post()
  @RequirePermission(PermissionModule.AREA, 'create')
  @AuditLog('Area')
  @ApiOperation({ summary: 'Buat area baru' })
  create(@Body() dto: CreateAreaDto) {
    return this.areasService.create(dto);
  }

  @Patch(':id')
  @RequirePermission(PermissionModule.AREA, 'edit')
  @AuditLog('Area')
  @ApiOperation({ summary: 'Update area' })
  update(@Param('id', ParseUuidPipe) id: string, @Body() dto: UpdateAreaDto) {
    return this.areasService.update(id, dto);
  }

  @Delete(':id')
  @RequirePermission(PermissionModule.AREA, 'delete')
  @AuditLog('Area')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Soft delete area — ditolak jika masih ada equipment aktif' })
  remove(@Param('id', ParseUuidPipe) id: string) {
    return this.areasService.remove(id);
  }
}
