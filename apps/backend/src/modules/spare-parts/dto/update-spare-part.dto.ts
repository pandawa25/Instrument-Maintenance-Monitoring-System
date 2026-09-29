import { OmitType, PartialType } from '@nestjs/swagger';
import { CreateSparePartDto } from './create-spare-part.dto';

// `stock` sengaja di-omit dari update — sejak Stock Movement Ledger, stock
// TIDAK BOLEH diubah langsung lewat PATCH /spare-parts/:id. Perubahan stock
// wajib lewat POST /spare-parts/:id/stock-movements (RESTOCK/ADJUSTMENT) agar
// selalu tercatat di ledger.
export class UpdateSparePartDto extends PartialType(OmitType(CreateSparePartDto, ['stock'] as const)) {}
