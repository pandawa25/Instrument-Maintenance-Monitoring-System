import { Module } from '@nestjs/common';
import { MaintenanceHistoryController } from './maintenance-history.controller';
import { MaintenanceHistoryService } from './maintenance-history.service';
import { MaintenanceHistoryRepository } from './maintenance-history.repository';

// PrismaService & PermissionsService (dipakai PermissionGuard) disediakan modul global/terimpor
// di AppModule seperti modul lain — lihat MaintenanceModule untuk pola yang sama.
@Module({
  controllers: [MaintenanceHistoryController],
  providers: [MaintenanceHistoryService, MaintenanceHistoryRepository],
})
export class MaintenanceHistoryModule {}
