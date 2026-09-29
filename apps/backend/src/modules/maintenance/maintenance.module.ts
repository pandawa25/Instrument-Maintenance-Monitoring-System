import { Module } from '@nestjs/common';
import { MaintenanceController } from './maintenance.controller';
import { MaintenanceService } from './maintenance.service';
import { MaintenanceRepository } from './maintenance.repository';
import { EquipmentModule } from '../equipment/equipment.module';
import { UsersModule } from '../users/users.module';
import { SparePartsModule } from '../spare-parts/spare-parts.module';

@Module({
  imports: [EquipmentModule, UsersModule, SparePartsModule], // dipakai untuk validasi equipmentId, technicianId & sparePartId + sinkronisasi areaId
  controllers: [MaintenanceController],
  providers: [MaintenanceService, MaintenanceRepository],
  exports: [MaintenanceService], // dipakai AttachmentsModule untuk validasi entityId
})
export class MaintenanceModule {}
