import { Body, Controller, Get, Param, ParseEnumPipe, Put, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { PermissionModule } from '@prisma/client';
import { PermissionsService } from './permissions.service';
import { UpdateRolePermissionDto } from './dto/update-role-permission.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { ParseUuidPipe } from '../../common/pipes/parse-uuid.pipe';

/**
 * Halaman pengaturan Matriks Role & Permission — SELALU Admin only lewat
 * @Roles('Admin') (bukan @RequirePermission), sama seperti User Management.
 * Modul ini mengatur matriks itu sendiri, jadi tidak boleh ikut diatur oleh
 * matriks (self-lockout risk kalau sampai Admin kehilangan akses ke sini).
 */
@ApiTags('Permissions')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('Admin')
@Controller('permissions')
export class PermissionsController {
  constructor(private readonly permissionsService: PermissionsService) {}

  @Get('matrix')
  @ApiOperation({ summary: 'Ambil seluruh matriks hak akses — semua role selain Admin x semua modul (Admin only)' })
  getMatrix() {
    return this.permissionsService.getMatrix();
  }

  @Put(':roleId/:module')
  @ApiOperation({ summary: 'Update satu baris matriks hak akses (role x module) (Admin only)' })
  update(
    @Param('roleId', ParseUuidPipe) roleId: string,
    @Param('module', new ParseEnumPipe(PermissionModule)) module: PermissionModule,
    @Body() dto: UpdateRolePermissionDto,
  ) {
    return this.permissionsService.upsert(roleId, module, dto);
  }
}
