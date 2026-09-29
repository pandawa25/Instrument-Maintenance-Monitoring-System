import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
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
// DashboardModule ditunda sesuai permintaan — pasang lagi saat siap upload module Dashboard.
// import { DashboardModule } from './modules/dashboard/dashboard.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, load: [appConfig] }),
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
    // DashboardModule, // ditunda — lihat catatan import di atas
  ],
})
export class AppModule {}
