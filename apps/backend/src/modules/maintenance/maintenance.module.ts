import { Module } from '@nestjs/common';
import { MaintenanceController } from './maintenance.controller';
import { MaintenanceService } from './maintenance.service';
import { MaintenanceRepository } from './maintenance.repository';
import { EquipmentModule } from '../equipment/equipment.module';
import { UsersModule } from '../users/users.module';
import { SparePartsModule } from '../spare-parts/spare-parts.module';
import { WorkOrdersModule } from '../work-orders/work-orders.module';

@Module({
  // WorkOrdersModule: dipakai untuk validasi workOrderId opsional yang dikirim dari form CM
  // (lihat MaintenanceService.validateWorkOrder) — link ke modul Notification & Work Order.
  imports: [EquipmentModule, UsersModule, SparePartsModule, WorkOrdersModule], // dipakai untuk validasi equipmentId, technicianId & sparePartId + sinkronisasi areaId
  controllers: [MaintenanceController],
  providers: [MaintenanceService, MaintenanceRepository],
  exports: [MaintenanceService], // dipakai AttachmentsModule untuk validasi entityId
})
export class MaintenanceModule {}
