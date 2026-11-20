import { Module } from '@nestjs/common';
import { HighlightsController } from './highlights.controller';
import { HighlightsService } from './highlights.service';
import { HighlightsRepository } from './highlights.repository';

// PermissionsService tidak perlu di-import eksplisit — PermissionsModule bersifat
// @Global() (lihat permissions.module.ts).
@Module({
  controllers: [HighlightsController],
  providers: [HighlightsService, HighlightsRepository],
})
export class HighlightsModule {}
