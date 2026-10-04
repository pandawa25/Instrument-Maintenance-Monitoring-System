import { Global, Module } from '@nestjs/common';
import { PermissionsController } from './permissions.controller';
import { PermissionsService } from './permissions.service';
import { PermissionGuard } from '../../common/guards/permission.guard';

/**
 * @Global supaya PermissionsService & PermissionGuard bisa langsung dipakai
 * (@UseGuards(PermissionGuard) + @RequirePermission(...)) di controller modul
 * manapun tanpa perlu import PermissionsModule satu-satu di setiap module.ts
 * (sama seperti pola ConfigModule.forRoot({ isGlobal: true })).
 */
@Global()
@Module({
  controllers: [PermissionsController],
  providers: [PermissionsService, PermissionGuard],
  exports: [PermissionsService, PermissionGuard],
})
export class PermissionsModule {}
