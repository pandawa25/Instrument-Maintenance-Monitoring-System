import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean } from 'class-validator';

// Dipakai bersama oleh Corrective Maintenance, PM Period Execution, dan Work Order —
// ketiganya punya kolom is_highlighted dengan bentuk & semantik yang identik
// (shared/global flag, bukan per-user; lihat catatan di schema.prisma
// CorrectiveMaintenance.isHighlighted untuk alasan desain lengkap).
export class ToggleHighlightDto {
  @ApiProperty({ description: 'true = tandai sebagai highlight, false = batalkan tanda' })
  @IsBoolean()
  isHighlighted!: boolean;
}
