import { ExecutionContext, CallHandler } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { of, firstValueFrom } from 'rxjs';
import { AuditLogInterceptor } from './audit-log.interceptor';

function buildContext(request: Record<string, unknown>) {
  return {
    getType: () => 'http',
    switchToHttp: () => ({ getRequest: () => request }),
    getHandler: () => jest.fn(),
    getClass: () => jest.fn(),
  } as unknown as ExecutionContext;
}

function buildCallHandler(result: unknown) {
  return { handle: () => of(result) } as unknown as CallHandler;
}

function buildPrismaMock() {
  return { auditLog: { create: jest.fn().mockResolvedValue(undefined) } };
}

const authUser = { id: 'user-1', email: 'admin@imms.local', fullName: 'Admin', role: 'Admin' };

describe('AuditLogInterceptor', () => {
  it('meloloskan request tanpa menulis apa pun kalau endpoint tidak dipasangi @AuditLog()', async () => {
    const prisma = buildPrismaMock();
    const reflector = { get: jest.fn().mockReturnValue(undefined) } as unknown as Reflector;
    const interceptor = new AuditLogInterceptor(prisma as any, reflector);

    const request = { method: 'POST', headers: {}, params: {}, body: { name: 'x' } };
    const result = await firstValueFrom(
      interceptor.intercept(buildContext(request), buildCallHandler({ id: 'new-id' })),
    );

    expect(result).toEqual({ id: 'new-id' });
    expect(prisma.auditLog.create).not.toHaveBeenCalled();
  });

  it('tidak menulis audit log untuk method yang tidak dipetakan ke action manapun (mis. GET)', async () => {
    const prisma = buildPrismaMock();
    const reflector = { get: jest.fn().mockReturnValue('Area') } as unknown as Reflector;
    const interceptor = new AuditLogInterceptor(prisma as any, reflector);

    const request = { method: 'GET', headers: {}, params: {}, body: {} };
    await firstValueFrom(interceptor.intercept(buildContext(request), buildCallHandler({ id: 'x' })));

    expect(prisma.auditLog.create).not.toHaveBeenCalled();
  });

  it('tidak menulis audit log kalau request tidak punya user (defensif, seharusnya tidak terjadi krn JwtAuthGuard)', async () => {
    const prisma = buildPrismaMock();
    const reflector = { get: jest.fn().mockReturnValue('Area') } as unknown as Reflector;
    const interceptor = new AuditLogInterceptor(prisma as any, reflector);

    const request = { method: 'POST', headers: {}, params: {}, body: { name: 'x' } };
    await firstValueFrom(interceptor.intercept(buildContext(request), buildCallHandler({ id: 'x' })));

    expect(prisma.auditLog.create).not.toHaveBeenCalled();
  });

  it('CREATE (POST): entityId diambil dari response, payload body ikut disimpan', async () => {
    const prisma = buildPrismaMock();
    const reflector = { get: jest.fn().mockReturnValue('Area') } as unknown as Reflector;
    const interceptor = new AuditLogInterceptor(prisma as any, reflector);

    const request = {
      method: 'POST',
      headers: { 'user-agent': 'jest-agent', 'x-forwarded-for': '10.0.0.5' },
      params: {},
      body: { areaCode: 'AR-01', areaName: 'Area Satu' },
      user: authUser,
    };

    await firstValueFrom(
      interceptor.intercept(buildContext(request), buildCallHandler({ id: 'area-1', areaCode: 'AR-01' })),
    );

    expect(prisma.auditLog.create).toHaveBeenCalledWith({
      data: {
        userId: 'user-1',
        action: 'CREATE',
        entityType: 'Area',
        entityId: 'area-1',
        payload: { areaCode: 'AR-01', areaName: 'Area Satu' },
        ipAddress: '10.0.0.5',
        userAgent: 'jest-agent',
      },
    });
  });

  it('UPDATE (PATCH): entityId diambil dari request.params.id, bukan dari response', async () => {
    const prisma = buildPrismaMock();
    const reflector = { get: jest.fn().mockReturnValue('Vendor') } as unknown as Reflector;
    const interceptor = new AuditLogInterceptor(prisma as any, reflector);

    const request = {
      method: 'PATCH',
      headers: {},
      params: { id: 'vendor-9' },
      body: { name: 'Vendor Baru' },
      user: authUser,
    };

    await firstValueFrom(
      interceptor.intercept(buildContext(request), buildCallHandler({ id: 'vendor-9', name: 'Vendor Baru' })),
    );

    const call = prisma.auditLog.create.mock.calls[0][0];
    expect(call.data.action).toBe('UPDATE');
    expect(call.data.entityId).toBe('vendor-9');
  });

  it('DELETE: payload undefined kalau body kosong (khas request DELETE)', async () => {
    const prisma = buildPrismaMock();
    const reflector = { get: jest.fn().mockReturnValue('Vendor') } as unknown as Reflector;
    const interceptor = new AuditLogInterceptor(prisma as any, reflector);

    const request = { method: 'DELETE', headers: {}, params: { id: 'vendor-9' }, body: {}, user: authUser };

    await firstValueFrom(interceptor.intercept(buildContext(request), buildCallHandler({ id: 'vendor-9' })));

    const call = prisma.auditLog.create.mock.calls[0][0];
    expect(call.data.action).toBe('DELETE');
    expect(call.data.payload).toBeUndefined();
  });

  it('me-redact field password di payload sebelum disimpan (mis. reset password user)', async () => {
    const prisma = buildPrismaMock();
    const reflector = { get: jest.fn().mockReturnValue('User') } as unknown as Reflector;
    const interceptor = new AuditLogInterceptor(prisma as any, reflector);

    const request = {
      method: 'PATCH',
      headers: {},
      params: { id: 'user-9' },
      body: { newPassword: 'rahasia-banget' },
      user: authUser,
    };

    await firstValueFrom(interceptor.intercept(buildContext(request), buildCallHandler({ id: 'user-9' })));

    const call = prisma.auditLog.create.mock.calls[0][0];
    expect(call.data.payload).toEqual({ newPassword: '[REDACTED]' });
  });

  it('kegagalan tulis audit log TIDAK menggagalkan response asli (best-effort)', async () => {
    const prisma = { auditLog: { create: jest.fn().mockRejectedValue(new Error('DB down')) } };
    const reflector = { get: jest.fn().mockReturnValue('Area') } as unknown as Reflector;
    const interceptor = new AuditLogInterceptor(prisma as any, reflector);
    const loggerErrorSpy = jest.spyOn((interceptor as any).logger, 'error').mockImplementation();

    const request = { method: 'POST', headers: {}, params: {}, body: { x: 1 }, user: authUser };

    const result = await firstValueFrom(
      interceptor.intercept(buildContext(request), buildCallHandler({ id: 'area-1' })),
    );

    expect(result).toEqual({ id: 'area-1' });
    // Tunggu microtask promise .catch() di dalam interceptor selesai jalan.
    await new Promise((resolve) => setImmediate(resolve));
    expect(loggerErrorSpy).toHaveBeenCalled();
  });

  it('melewati request non-HTTP (mis. RPC/WS) tanpa error', async () => {
    const prisma = buildPrismaMock();
    const reflector = { get: jest.fn() } as unknown as Reflector;
    const interceptor = new AuditLogInterceptor(prisma as any, reflector);

    const context = { getType: () => 'rpc' } as unknown as ExecutionContext;
    const result = await firstValueFrom(interceptor.intercept(context, buildCallHandler('ok')));

    expect(result).toBe('ok');
    expect(prisma.auditLog.create).not.toHaveBeenCalled();
  });
});
