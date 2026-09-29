import { Module } from '@nestjs/common';
import { EquipmentController } from './equipment.controller';
import { EquipmentService } from './equipment.service';
import { EquipmentRepository } from './equipment.repository';
import { EquipmentBulkUploadService } from './equipment-bulk-upload.service';
import { ImportBatchRepository } from './import-batch.repository';
import { AreasModule } from '../areas/areas.module';
import { InstrumentNamesModule } from '../instrument-names/instrument-names.module';

@Module({
  imports: [AreasModule, InstrumentNamesModule], // dipakai untuk validasi areaId & instrumentNameId
  controllers: [EquipmentController],
  providers: [EquipmentService, EquipmentRepository, EquipmentBulkUploadService, ImportBatchRepository],
  exports: [EquipmentService], // dipakai module Corrective Maintenance untuk validasi equipment_id
})
export class EquipmentModule {}
