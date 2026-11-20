import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { LoggerModule } from 'nestjs-pino';
import { appConfig } from './config/app.config';
import { buildPinoHttpOptions } from './config/logger.config';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { AreasModule } from './modules/areas/areas.module';
import { InstrumentNamesModule } from './modules/instrument-names/instrument-names.module';
import { EquipmentModule } from './modules/equipment/equipment.module';
import { RolesModule } from './modules/roles/roles.module';
import { PermissionsModule } from './modules/permissions/permissions.module';
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
import { MaintenanceHistoryModule } from './modules/maintenance-history/maintenance-history.module';
import { WorkOrdersModule } from './modules/work-orders/work-orders.module';
import { HighlightsModule } from './modules/highlights/highlights.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, load: [appConfig] }),
    // Structured logging (Risk #10, docs/roadmap.md) — menggantikan Nest
    // Logger bawaan (console polos, tidak bisa di-query) dengan Pino. Semua
    // `new Logger(context)`/`this.logger.*` yang sudah ada di codebase
    // (global-exception.filter, audit-log.interceptor, bulk-upload services)
    // TIDAK perlu diubah — begitu main.ts memanggil `app.useLogger()`, Nest
    // merutekan seluruh log internal lewat Pino secara transparan. Dipasang
    // lewat forRootAsync (bukan forRoot) supaya baca NODE_ENV dari
    // ConfigService yang sama dengan modul lain, bukan `process.env` langsung.
    LoggerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        pinoHttp: buildPinoHttpOptions(config.get<string>('nodeEnv') ?? 'development'),
      }),
    }),
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
    PermissionsModule,
    UsersModule,
    MaintenanceModule,
    MaintenanceHistoryModule,
    WorkOrdersModule,
    HighlightsModule,
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
