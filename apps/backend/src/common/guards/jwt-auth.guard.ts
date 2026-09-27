import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/**
 * Melindungi endpoint dengan JWT. Pakai di controller: @UseGuards(JwtAuthGuard)
 * Strategi validasi token ada di modules/auth/strategies/jwt.strategy.ts
 */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}
