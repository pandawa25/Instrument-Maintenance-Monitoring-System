import { Injectable } from '@nestjs/common';
import { RolesRepository } from './roles.repository';

@Injectable()
export class RolesService {
  constructor(private readonly repository: RolesRepository) {}

  findAll() {
    return this.repository.findAll();
  }

  // Dipakai UsersService untuk validasi roleId sebelum create/update user.
  async exists(roleId: string): Promise<boolean> {
    const role = await this.repository.findById(roleId);
    return Boolean(role);
  }
}
