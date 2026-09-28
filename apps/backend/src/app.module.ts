import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { appConfig } from './config/app.config';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { AreasModule } from './modules/areas/areas.module';
import { InstrumentTypesModule } from './modules/instrument-types/instrument-types.module';
import { InstrumentsModule } from './modules/instruments/instruments.module';
import { RolesModule } from './modules/roles/roles.module';
import { UsersModule } from './modules/users/users.module';
import { MaintenanceModule } from './modules/maintenance/maintenance.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, load: [appConfig] }),
    PrismaModule,
    AuthModule,
    AreasModule,
    InstrumentTypesModule,
    InstrumentsModule,
    RolesModule,
    UsersModule,
    MaintenanceModule,
    DashboardModule,
  ],
})
export class AppModule {}
