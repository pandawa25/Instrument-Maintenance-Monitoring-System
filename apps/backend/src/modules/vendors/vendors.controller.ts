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
import { VendorsService } from './vendors.service';
import { CreateVendorDto } from './dto/create-vendor.dto';
import { UpdateVendorDto } from './dto/update-vendor.dto';
import { QueryVendorDto } from './dto/query-vendor.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { AuditLog } from '../../common/decorators/audit-log.decorator';
import { ParseUuidPipe } from '../../common/pipes/parse-uuid.pipe';

@ApiTags('Vendors')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('vendors')
export class VendorsController {
  constructor(private readonly vendorsService: VendorsService) {}

  @Get()
  @ApiOperation({ summary: 'List vendor — search, filter status, pagination' })
  findAll(@Query() query: QueryVendorDto) {
    return this.vendorsService.findAll(query);
  }

  @Get('dropdown')
  @ApiOperation({ summary: 'List vendor aktif tanpa pagination — untuk dropdown form PM Program' })
  findAllForDropdown() {
    return this.vendorsService.findAllForDropdown();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Detail satu vendor' })
  findOne(@Param('id', ParseUuidPipe) id: string) {
    return this.vendorsService.findOne(id);
  }

  @Post()
  @Roles('Admin')
  @AuditLog('Vendor')
  @ApiOperation({ summary: 'Buat vendor baru (Admin only)' })
  create(@Body() dto: CreateVendorDto) {
    return this.vendorsService.create(dto);
  }

  @Patch(':id')
  @Roles('Admin')
  @AuditLog('Vendor')
  @ApiOperation({ summary: 'Update vendor (Admin only)' })
  update(@Param('id', ParseUuidPipe) id: string, @Body() dto: UpdateVendorDto) {
    return this.vendorsService.update(id, dto);
  }

  @Delete(':id')
  @Roles('Admin')
  @AuditLog('Vendor')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Soft delete vendor (Admin only) — ditolak jika masih ada PM Program aktif' })
  remove(@Param('id', ParseUuidPipe) id: string) {
    return this.vendorsService.remove(id);
  }
}
