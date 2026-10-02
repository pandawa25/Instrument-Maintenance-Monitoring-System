import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { buildSafeOrderBy } from '../../common/utils/safe-order-by.util';

const SORTABLE_FIELDS = ['email', 'fullName', 'isActive', 'lastLoginAt', 'createdAt', 'updatedAt'] as const;
import { QueryUserDto } from './dto/query-user.dto';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

const MANAGE_SELECT = {
  id: true,
  fullName: true,
  email: true,
  isActive: true,
  lastLoginAt: true,
  createdAt: true,
  updatedAt: true,
  role: { select: { id: true, name: true } },
} satisfies Prisma.UserSelect;

@Injectable()
export class UsersRepository {
  constructor(private readonly prisma: PrismaService) {}

  // --- Lookup ringan, dipakai dropdown Technician di form Corrective Maintenance ---
  // JANGAN diubah shape-nya — module Maintenance bergantung pada bentuk ini.
  findAllActive() {
    return this.prisma.user.findMany({
      where: { deletedAt: null, isActive: true },
      orderBy: { fullName: 'asc' },
      select: {
        id: true,
        fullName: true,
        email: true,
        role: { select: { id: true, name: true } },
      },
    });
  }

  findById(id: string) {
    return this.prisma.user.findFirst({
      where: { id, deletedAt: null },
      select: {
        id: true,
        fullName: true,
        email: true,
        role: { select: { id: true, name: true } },
      },
    });
  }

  // --- Manage User (Admin only) ---
  private buildWhere(query: QueryUserDto): Prisma.UserWhereInput {
    const where: Prisma.UserWhereInput = { deletedAt: null };

    if (query.roleId) {
      where.roleId = query.roleId;
    }

    if (query.isActive !== undefined) {
      where.isActive = query.isActive;
    }

    if (query.search) {
      where.OR = [
        { fullName: { contains: query.search, mode: 'insensitive' } },
        { email: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    return where;
  }

  async findMany(query: QueryUserDto) {
    const where = this.buildWhere(query);

    const [rows, total] = await this.prisma.$transaction([
      this.prisma.user.findMany({
        where,
        skip: query.skip,
        take: query.limit,
        orderBy: buildSafeOrderBy(query.sortBy, query.sortOrder, SORTABLE_FIELDS, 'createdAt'),
        select: MANAGE_SELECT,
      }),
      this.prisma.user.count({ where }),
    ]);

    return { rows, total };
  }

  findByIdDetail(id: string) {
    return this.prisma.user.findFirst({ where: { id, deletedAt: null }, select: MANAGE_SELECT });
  }

  findByEmail(email: string) {
    return this.prisma.user.findFirst({ where: { email, deletedAt: null } });
  }

  create(dto: CreateUserDto, passwordHash: string) {
    return this.prisma.user.create({
      data: {
        fullName: dto.fullName,
        email: dto.email,
        passwordHash,
        roleId: dto.roleId,
        isActive: dto.isActive ?? true,
      },
      select: MANAGE_SELECT,
    });
  }

  update(id: string, dto: UpdateUserDto) {
    return this.prisma.user.update({ where: { id }, data: dto, select: MANAGE_SELECT });
  }

  updatePassword(id: string, passwordHash: string) {
    return this.prisma.user.update({ where: { id }, data: { passwordHash } });
  }

  softDelete(id: string) {
    return this.prisma.user.update({ where: { id }, data: { deletedAt: new Date() } });
  }
}
