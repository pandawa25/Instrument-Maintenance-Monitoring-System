import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';

// Master Instrument Name tidak punya field status — hanya search + pagination standar.
export class QueryInstrumentNameDto extends PaginationQueryDto {}
