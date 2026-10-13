import { ForbiddenException, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PermissionGuard } from './permission.guard';

function buildContext(user: unknown): ExecutionContext {
  return {
    getHandler: () => undefined,
    getClass: () => undefined,
    switchToHttp: () => ({ getRequest: () => ({ user }) }),
  } as unknown as ExecutionContext;
}

describe('PermissionGuard', () => {
  const user = { id: 'u1', role: 'View', roleId: 'r1' };

  function build(required: unknown, granted: string[]) {
    const reflector = { getAllAndOverride: jest.fn().mockReturnValue(required) } as unknown as Reflector;
    const permissions = {
      hasPermission: jest.fn(async (_u: unknown, _m: string, action: string) => granted.includes(action)),
    };
    return { guard: new PermissionGuard(reflector, permissions as any), permissions };
  }

  it('meloloskan endpoint tanpa @RequirePermission', async () => {
    const { guard } = build(undefined, []);
    await expect(guard.canActivate(buildContext(user))).resolves.toBe(true);
  });

  it('aksi tunggal: lolos jika punya, 403 jika tidak', async () => {
    const ok = build({ module: 'EQUIPMENT', action: 'view' }, ['view']);
    await expect(ok.guard.canActivate(buildContext(user))).resolves.toBe(true);

    const denied = build({ module: 'EQUIPMENT', action: 'edit' }, ['view']);
    await expect(denied.guard.canActivate(buildContext(user))).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('any-of: role read-only (hanya view) ditolak untuk [create, edit]', async () => {
    const { guard } = build({ module: 'EQUIPMENT', action: ['create', 'edit'] }, ['view']);
    await expect(guard.canActivate(buildContext(user))).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('any-of: lolos kalau punya salah satu aksi', async () => {
    const { guard } = build({ module: 'EQUIPMENT', action: ['create', 'edit'] }, ['edit']);
    await expect(guard.canActivate(buildContext(user))).resolves.toBe(true);
  });

  it('tanpa user -> 403', async () => {
    const { guard } = build({ module: 'EQUIPMENT', action: 'view' }, ['view']);
    await expect(guard.canActivate(buildContext(undefined))).rejects.toBeInstanceOf(ForbiddenException);
  });
});
