// Bentuk PaginatedResult<T> harus sinkron dengan common/dto/pagination-query.dto.ts di backend.
// Idealnya di-import dari packages/shared-types — didefinisikan lokal dulu di sini
// supaya module Area bisa jalan sebelum shared-types package dibangun penuh.
export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface PaginatedResult<T> {
  data: T[];
  meta: PaginationMeta;
}
