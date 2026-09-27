import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { appConfig } from './config/app.config';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { AreasModule } from './modules/areas/areas.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, load: [appConfig] }),
    PrismaModule,
    AuthModule,
    AreasModule,
    // InstrumentsModule dan CorrectiveMaintenanceModule ditambahkan di tahap berikutnya,
    // mengikuti pola yang sama dengan AreasModule.
  ],
})
export class AppModule {}
