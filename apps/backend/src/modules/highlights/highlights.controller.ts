import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { HighlightsService } from './highlights.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser, AuthenticatedUser } from '../../common/decorators/current-user.decorator';

// SENGAJA tidak pakai @RequirePermission — tidak ada 1 modul tunggal yang relevan untuk
// endpoint gabungan ini. Filtering per-section (CM/PM/WO) dilakukan di HighlightsService
// sesuai hak akses VIEW user ke masing-masing modul. Lihat juga PermissionGuard: endpoint
// tanpa @RequirePermission otomatis lolos untuk semua user yang sudah login (JwtAuthGuard).
@ApiTags('Highlight Pekerjaan')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('highlights')
export class HighlightsController {
  constructor(private readonly service: HighlightsService) {}

  @Get()
  @ApiOperation({
    summary:
      'Gabungan pekerjaan yang ditandai highlight dari Corrective Maintenance, PM Period ' +
      'Execution, dan Work Order — tiap section difilter sesuai hak akses view user',
  })
  findAll(@CurrentUser() user: AuthenticatedUser) {
    return this.service.findAll(user);
  }
}
