import { PartialType } from '@nestjs/swagger';
import { CreateEquipmentDto } from './create-equipment.dto';

// PATCH /equipment/:id menerima semua field CreateEquipmentDto secara opsional.
export class UpdateEquipmentDto extends PartialType(CreateEquipmentDto) {}
