import { Injectable, NotFoundException } from '@nestjs/common';
import { InstrumentTypesRepository } from './instrument-types.repository';

@Injectable()
export class InstrumentTypesService {
  constructor(private readonly repository: InstrumentTypesRepository) {}

  findAll() {
    return this.repository.findAllActive();
  }

  async findOne(id: string) {
    const type = await this.repository.findById(id);
    if (!type) {
      throw new NotFoundException('Instrument type tidak ditemukan');
    }
    return type;
  }
}
