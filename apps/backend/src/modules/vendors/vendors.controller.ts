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
import { VendorsService } from './vendors.service';
import { CreateVendorDto } from './dto/create-vendor.dto';
import { UpdateVendorDto } from './dto/update-vendor.dto';
import { QueryVendorDto } from './dto/query-vendor.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionGuard } from '../../common/guards/permission.guard';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';
import { AuditLog } from '../../common/decorators/audit-log.decorator';
import { ParseUuidPipe } from '../../common/pipes/parse-uuid.pipe';

@ApiTags('Vendors')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionGuard)
@Controller('vendors')
export class VendorsController {
  constructor(private readonly vendorsService: VendorsService) {}

  @Get()
  @RequirePermission(PermissionModule.VENDOR, 'view')
  @ApiOperation({ summary: 'List vendor — search, filter status, pagination' })
  findAll(@Query() query: QueryVendorDto) {
    return this.vendorsService.findAll(query);
  }

  @Get('dropdown')
  @RequirePermission(PermissionModule.VENDOR, 'view')
  @ApiOperation({ summary: 'List vendor aktif tanpa pagination — untuk dropdown form PM Program' })
  findAllForDropdown() {
    return this.vendorsService.findAllForDropdown();
  }

  @Get(':id')
  @RequirePermission(PermissionModule.VENDOR, 'view')
  @ApiOperation({ summary: 'Detail satu vendor' })
  findOne(@Param('id', ParseUuidPipe) id: string) {
    return this.vendorsService.findOne(id);
  }

  @Post()
  @RequirePermission(PermissionModule.VENDOR, 'create')
  @AuditLog('Vendor')
  @ApiOperation({ summary: 'Buat vendor baru' })
  create(@Body() dto: CreateVendorDto) {
    return this.vendorsService.create(dto);
  }

  @Patch(':id')
  @RequirePermission(PermissionModule.VENDOR, 'edit')
  @AuditLog('Vendor')
  @ApiOperation({ summary: 'Update vendor' })
  update(@Param('id', ParseUuidPipe) id: string, @Body() dto: UpdateVendorDto) {
    return this.vendorsService.update(id, dto);
  }

  @Delete(':id')
  @RequirePermission(PermissionModule.VENDOR, 'delete')
  @AuditLog('Vendor')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Soft delete vendor — ditolak jika masih ada PM Program aktif' })
  remove(@Param('id', ParseUuidPipe) id: string) {
    return this.vendorsService.remove(id);
  }
}
