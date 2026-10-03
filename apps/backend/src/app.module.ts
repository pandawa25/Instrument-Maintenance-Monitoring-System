import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { appConfig } from './config/app.config';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { AreasModule } from './modules/areas/areas.module';
import { InstrumentNamesModule } from './modules/instrument-names/instrument-names.module';
import { EquipmentModule } from './modules/equipment/equipment.module';
import { RolesModule } from './modules/roles/roles.module';
import { UsersModule } from './modules/users/users.module';
import { MaintenanceModule } from './modules/maintenance/maintenance.module';
import { VendorsModule } from './modules/vendors/vendors.module';
import { PmActivityTypesModule } from './modules/pm-activity-types/pm-activity-types.module';
import { PmProgramsModule } from './modules/pm-programs/pm-programs.module';
import { PmPeriodsModule } from './modules/pm-periods/pm-periods.module';
import { SparePartsModule } from './modules/spare-parts/spare-parts.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { AttachmentsModule } from './modules/attachments/attachments.module';
import { HealthModule } from './modules/health/health.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, load: [appConfig] }),
    // Rate limit global default — proteksi dasar di semua endpoint. Endpoint
    // login punya limit lebih ketat sendiri lewat @Throttle() di AuthController
    // (lihat catatan di sana) karena brute-force password jauh lebih murah
    // dilakukan attacker dibanding abuse endpoint biasa.
    ThrottlerModule.forRoot([
      {
        ttl: 60_000, // 1 menit
        limit: 100, // 100 request/menit/IP untuk endpoint umum
      },
    ]),
    PrismaModule,
    AuthModule,
    AreasModule,
    InstrumentNamesModule,
    EquipmentModule,
    RolesModule,
    UsersModule,
    MaintenanceModule,
    VendorsModule,
    PmActivityTypesModule,
    PmProgramsModule,
    PmPeriodsModule,
    SparePartsModule,
    DashboardModule,
    AttachmentsModule,
    HealthModule,
  ],
  providers: [
    // Aktif sebagai guard global — tiap route otomatis kena limit default di
    // atas, kecuali route yang pasang @Throttle() sendiri (override per-route).
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
})
export class AppModule {}
