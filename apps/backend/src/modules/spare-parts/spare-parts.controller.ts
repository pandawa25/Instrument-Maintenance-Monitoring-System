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
import { SparePartsService } from './spare-parts.service';
import { CreateSparePartDto } from './dto/create-spare-part.dto';
import { UpdateSparePartDto } from './dto/update-spare-part.dto';
import { QuerySparePartDto } from './dto/query-spare-part.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { ParseUuidPipe } from '../../common/pipes/parse-uuid.pipe';

@ApiTags('Spare Parts')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('spare-parts')
export class SparePartsController {
  constructor(private readonly sparePartsService: SparePartsService) {}

  @Get()
  @ApiOperation({ summary: 'List spare part / material — search, filter status, pagination' })
  findAll(@Query() query: QuerySparePartDto) {
    return this.sparePartsService.findAll(query);
  }

  @Get('dropdown')
  @ApiOperation({ summary: 'List spare part aktif tanpa pagination — untuk dropdown form Corrective Maintenance' })
  findAllForDropdown() {
    return this.sparePartsService.findAllForDropdown();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Detail satu spare part / material' })
  findOne(@Param('id', ParseUuidPipe) id: string) {
    return this.sparePartsService.findOne(id);
  }

  @Post()
  @Roles('Admin')
  @ApiOperation({ summary: 'Buat spare part / material baru (Admin only)' })
  create(@Body() dto: CreateSparePartDto) {
    return this.sparePartsService.create(dto);
  }

  @Patch(':id')
  @Roles('Admin')
  @ApiOperation({ summary: 'Update spare part / material (Admin only)' })
  update(@Param('id', ParseUuidPipe) id: string, @Body() dto: UpdateSparePartDto) {
    return this.sparePartsService.update(id, dto);
  }

  @Delete(':id')
  @Roles('Admin')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Soft delete spare part / material (Admin only) — ditolak jika masih dipakai' })
  remove(@Param('id', ParseUuidPipe) id: string) {
    return this.sparePartsService.remove(id);
  }
}
