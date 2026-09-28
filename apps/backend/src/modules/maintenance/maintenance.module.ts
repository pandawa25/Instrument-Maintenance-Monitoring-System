import { Module } from '@nestjs/common';
import { MaintenanceController } from './maintenance.controller';
import { MaintenanceService } from './maintenance.service';
import { MaintenanceRepository } from './maintenance.repository';
import { InstrumentsModule } from '../instruments/instruments.module';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [InstrumentsModule, UsersModule], // dipakai untuk validasi instrumentId & technicianId + sinkronisasi areaId
  controllers: [MaintenanceController],
  providers: [MaintenanceService, MaintenanceRepository],
})
export class MaintenanceModule {}
