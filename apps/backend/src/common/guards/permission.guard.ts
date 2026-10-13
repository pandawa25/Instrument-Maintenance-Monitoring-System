import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSION_KEY, RequiredPermission } from '../decorators/require-permission.decorator';
import { AuthenticatedUser } from '../decorators/current-user.decorator';
import { PermissionsService } from '../../modules/permissions/permissions.service';

/**
 * Dipasang setelah JwtAuthGuard: @UseGuards(JwtAuthGuard, PermissionGuard) @RequirePermission(module, action)
 * Jika endpoint tidak diberi @RequirePermission(...), guard ini meloloskan semua request
 * yang sudah lolos JwtAuthGuard (sama seperti pola RolesGuard).
 */
@Injectable()
export class PermissionGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly permissionsService: PermissionsService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const required = this.reflector.getAllAndOverride<RequiredPermission | undefined>(PERMISSION_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!required) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user as AuthenticatedUser | undefined;

    if (!user) {
      throw new ForbiddenException('Anda tidak memiliki akses untuk melakukan aksi ini');
    }

    // action boleh berupa daftar -> lolos kalau user punya SALAH SATU aksi tsb.
    const actions = Array.isArray(required.action) ? required.action : [required.action];
    let allowed = false;
    for (const action of actions) {
      if (await this.permissionsService.hasPermission(user, required.module, action)) {
        allowed = true;
        break;
      }
    }
    if (!allowed) {
      throw new ForbiddenException('Anda tidak memiliki akses untuk melakukan aksi ini');
    }

    return true;
  }
}
