import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { QueryUserDto } from './dto/query-user.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { ParseUuidPipe } from '../../common/pipes/parse-uuid.pipe';
import { CurrentUser, AuthenticatedUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @ApiOperation({ summary: 'List user aktif — dipakai untuk dropdown Technician di form maintenance (semua role)' })
  findAll() {
    return this.usersService.findAllActive();
  }

  // --- Manage User (Admin only) ---

  @Get('admin')
  @Roles('Admin')
  @ApiOperation({ summary: 'List semua user — search, filter role/status, pagination (Admin only)' })
  findAllAdmin(@Query() query: QueryUserDto) {
    return this.usersService.findAll(query);
  }

  @Get('admin/:id')
  @Roles('Admin')
  @ApiOperation({ summary: 'Detail satu user (Admin only)' })
  findOneAdmin(@Param('id', ParseUuidPipe) id: string) {
    return this.usersService.findOneAdmin(id);
  }

  @Post('admin')
  @Roles('Admin')
  @ApiOperation({ summary: 'Buat user baru (Admin only)' })
  create(@Body() dto: CreateUserDto) {
    return this.usersService.create(dto);
  }

  @Patch('admin/:id')
  @Roles('Admin')
  @ApiOperation({ summary: 'Update profil/role/status user (Admin only) — tidak bisa nonaktifkan akun sendiri' })
  update(@Param('id', ParseUuidPipe) id: string, @Body() dto: UpdateUserDto, @CurrentUser() user: AuthenticatedUser) {
    return this.usersService.update(id, dto, user.id);
  }

  @Patch('admin/:id/password')
  @Roles('Admin')
  @ApiOperation({ summary: 'Reset password user (Admin only)' })
  changePassword(@Param('id', ParseUuidPipe) id: string, @Body() dto: ChangePasswordDto) {
    return this.usersService.changePassword(id, dto);
  }

  @Delete('admin/:id')
  @Roles('Admin')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Soft delete user (Admin only) — tidak bisa hapus akun sendiri' })
  remove(@Param('id', ParseUuidPipe) id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.usersService.remove(id, user.id);
  }
}
