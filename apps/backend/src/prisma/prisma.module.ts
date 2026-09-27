import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';

// Global agar tidak perlu import PrismaModule di setiap feature module.
@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
