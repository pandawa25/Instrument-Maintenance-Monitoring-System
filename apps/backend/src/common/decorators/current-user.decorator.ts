import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export interface AuthenticatedUser {
  id: string;
  email: string;
  fullName: string;
  role: string;
  roleId: string;
}

/**
 * Pakai di controller: @CurrentUser() user: AuthenticatedUser
 * Mengambil payload user yang sudah divalidasi oleh JwtStrategy.
 */
export const CurrentUser = createParamDecorator((_data: unknown, ctx: ExecutionContext): AuthenticatedUser => {
  const request = ctx.switchToHttp().getRequest();
  return request.user;
});
