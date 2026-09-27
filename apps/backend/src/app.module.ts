import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { appConfig } from './config/app.config';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { AreasModule } from './modules/areas/areas.module';
import { InstrumentTypesModule } from './modules/instrument-types/instrument-types.module';
import { InstrumentsModule } from './modules/instruments/instruments.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, load: [appConfig] }),
    PrismaModule,
    AuthModule,
    AreasModule,
    InstrumentTypesModule,
    InstrumentsModule,
    // CorrectiveMaintenanceModule ditambahkan di tahap berikutnya,
    // mengikuti pola yang sama dengan InstrumentsModule.
  ],
})
export class AppModule {}
