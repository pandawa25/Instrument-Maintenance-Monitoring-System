import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolesGuard } from './roles.guard';
import { AuthenticatedUser } from '../decorators/current-user.decorator';

function buildContext(user: AuthenticatedUser | undefined): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => ({ user }),
    }),
    getHandler: () => jest.fn(),
    getClass: () => jest.fn(),
  } as unknown as ExecutionContext;
}

describe('RolesGuard', () => {
  let reflector: Reflector;
  let guard: RolesGuard;

  beforeEach(() => {
    reflector = new Reflector();
    guard = new RolesGuard(reflector);
  });

  const adminUser: AuthenticatedUser = {
    id: 'user-1',
    email: 'admin@imms.local',
    fullName: 'Admin',
    role: 'Admin',
  };

  const viewerUser: AuthenticatedUser = {
    id: 'user-2',
    email: 'viewer@imms.local',
    fullName: 'Viewer',
    role: 'Viewer',
  };

  it('meloloskan request kalau endpoint tidak diberi @Roles(...)', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(undefined);

    expect(guard.canActivate(buildContext(viewerUser))).toBe(true);
  });

  it('meloloskan request kalau role user cocok dengan salah satu @Roles(...)', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['Admin']);

    expect(guard.canActivate(buildContext(adminUser))).toBe(true);
  });

  it('menolak (ForbiddenException) kalau role user tidak ada di daftar @Roles(...)', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['Admin']);

    expect(() => guard.canActivate(buildContext(viewerUser))).toThrow(ForbiddenException);
  });

  it('menolak (ForbiddenException) kalau request tidak punya user sama sekali', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['Admin']);

    expect(() => guard.canActivate(buildContext(undefined))).toThrow(ForbiddenException);
  });
});
