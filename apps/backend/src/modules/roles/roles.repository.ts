import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

/**
 * Role adalah master data read-only untuk MVP (Admin & Viewer hasil seed).
 * CRUD role custom bisa ditambahkan di fase berikutnya jika dibutuhkan.
 */
@Injectable()
export class RolesRepository {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.role.findMany({
      where: { deletedAt: null },
      orderBy: { name: 'asc' },
    });
  }

  findById(id: string) {
    return this.prisma.role.findFirst({ where: { id, deletedAt: null } });
  }
}
