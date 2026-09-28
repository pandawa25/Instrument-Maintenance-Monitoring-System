import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

/**
 * Module Users MVP ini read-only — cukup untuk lookup technician di form
 * Corrective Maintenance dan validasi technician_id/created_by_id.
 * CRUD penuh ("Manage User") menyusul sebagai modul terpisah nanti.
 */
@Injectable()
export class UsersRepository {
  constructor(private readonly prisma: PrismaService) {}

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
}
