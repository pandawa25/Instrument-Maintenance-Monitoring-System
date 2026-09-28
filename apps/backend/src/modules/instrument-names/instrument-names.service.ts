import { Injectable, NotFoundException } from '@nestjs/common';
import { InstrumentNamesRepository } from './instrument-names.repository';

@Injectable()
export class InstrumentNamesService {
  constructor(private readonly repository: InstrumentNamesRepository) {}

  findAll() {
    return this.repository.findAllActive();
  }

  async findOne(id: string) {
    const item = await this.repository.findById(id);
    if (!item) {
      throw new NotFoundException('Instrument name tidak ditemukan');
    }
    return item;
  }
}
