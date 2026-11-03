import { Module } from '@nestjs/common';
import { WorkOrdersController } from './work-orders.controller';
import { WorkOrdersService } from './work-orders.service';
import { WorkOrdersRepository } from './work-orders.repository';
import { WorkOrderImportService } from './work-order-import.service';
import { ImportBatchRepository } from '../equipment/import-batch.repository';
import { EquipmentModule } from '../equipment/equipment.module';

@Module({
  // EquipmentModule: dipakai untuk matching tag saat import (findAllActiveEquipmentByTagUpper)
  // & validasi equipmentId saat relink manual (findOne) — lihat catatan di EquipmentService.
  imports: [EquipmentModule],
  controllers: [WorkOrdersController],
  providers: [WorkOrdersService, WorkOrdersRepository, WorkOrderImportService, ImportBatchRepository],
  // WorkOrdersService diekspor untuk MaintenanceModule (validasi workOrderId yang dikirim
  // dari form Corrective Maintenance, lihat MaintenanceService).
  exports: [WorkOrdersService],
})
export class WorkOrdersModule {}
