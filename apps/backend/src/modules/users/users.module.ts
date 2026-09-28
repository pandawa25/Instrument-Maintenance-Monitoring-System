import { Module } from '@nestjs/common';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { UsersRepository } from './users.repository';
import { RolesModule } from '../roles/roles.module';

@Module({
  imports: [RolesModule], // dipakai untuk validasi roleId saat create/update user
  controllers: [UsersController],
  providers: [UsersService, UsersRepository],
  exports: [UsersService], // dipakai module Corrective Maintenance untuk validasi technician_id
})
export class UsersModule {}
