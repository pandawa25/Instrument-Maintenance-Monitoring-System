import { Module } from '@nestjs/common';
import { AttachmentsController } from './attachments.controller';
import { AttachmentsService } from './attachments.service';
import { AttachmentsRepository } from './attachments.repository';
import { MaintenanceModule } from '../maintenance/maintenance.module';
import { PmPeriodsModule } from '../pm-periods/pm-periods.module';
import { EquipmentModule } from '../equipment/equipment.module';

@Module({
  // Dipakai untuk validasi entityId (findOne) sebelum menyimpan attachment —
  // pola yang sama dengan SparePartsModule di MaintenanceModule.
  imports: [MaintenanceModule, PmPeriodsModule, EquipmentModule],
  controllers: [AttachmentsController],
  providers: [AttachmentsService, AttachmentsRepository],
})
export class AttachmentsModule {}
