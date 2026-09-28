import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { UsersRepository } from './users.repository';
import { RolesService } from '../roles/roles.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { QueryUserDto } from './dto/query-user.dto';
import { buildPaginationMeta, PaginatedResult } from '../../common/dto/pagination-query.dto';

const SALT_ROUNDS = 10;

@Injectable()
export class UsersService {
  constructor(
    private readonly repository: UsersRepository,
    private readonly rolesService: RolesService,
  ) {}

  // --- Lookup ringan (dipakai module Maintenance) — jangan diubah kontraknya ---
  findAllActive() {
    return this.repository.findAllActive();
  }

  async findOne(id: string) {
    const user = await this.repository.findById(id);
    if (!user) {
      throw new NotFoundException('User tidak ditemukan atau tidak aktif');
    }
    return user;
  }

  // --- Manage User (Admin only) ---
  async findAll(query: QueryUserDto): Promise<PaginatedResult<unknown>> {
    const { rows, total } = await this.repository.findMany(query);
    return { data: rows, meta: buildPaginationMeta(query.page, query.limit, total) };
  }

  async findOneAdmin(id: string) {
    const user = await this.repository.findByIdDetail(id);
    if (!user) {
      throw new NotFoundException('User tidak ditemukan');
    }
    return user;
  }

  async create(dto: CreateUserDto) {
    const existing = await this.repository.findByEmail(dto.email);
    if (existing) {
      throw new ConflictException(`Email '${dto.email}' sudah digunakan`);
    }

    const roleValid = await this.rolesService.exists(dto.roleId);
    if (!roleValid) {
      throw new BadRequestException('Role tidak ditemukan');
    }

    const passwordHash = await bcrypt.hash(dto.password, SALT_ROUNDS);
    return this.repository.create(dto, passwordHash);
  }

  async update(id: string, dto: UpdateUserDto, currentUserId: string) {
    await this.findOneAdmin(id); // memastikan ada & belum dihapus

    if (dto.email) {
      const existing = await this.repository.findByEmail(dto.email);
      if (existing && existing.id !== id) {
        throw new ConflictException(`Email '${dto.email}' sudah digunakan`);
      }
    }

    if (dto.roleId) {
      const roleValid = await this.rolesService.exists(dto.roleId);
      if (!roleValid) {
        throw new BadRequestException('Role tidak ditemukan');
      }
    }

    // Cegah admin menonaktifkan atau mencabut role Admin dari akun miliknya sendiri (self-lockout).
    if (id === currentUserId && dto.isActive === false) {
      throw new ForbiddenException('Tidak bisa menonaktifkan akun sendiri');
    }

    return this.repository.update(id, dto);
  }

  async changePassword(id: string, dto: ChangePasswordDto) {
    await this.findOneAdmin(id);
    const passwordHash = await bcrypt.hash(dto.newPassword, SALT_ROUNDS);
    await this.repository.updatePassword(id, passwordHash);
    return { id, passwordChanged: true };
  }

  async remove(id: string, currentUserId: string) {
    await this.findOneAdmin(id);

    if (id === currentUserId) {
      throw new ForbiddenException('Tidak bisa menghapus akun sendiri');
    }

    await this.repository.softDelete(id);
    return { id, deleted: true };
  }
}
