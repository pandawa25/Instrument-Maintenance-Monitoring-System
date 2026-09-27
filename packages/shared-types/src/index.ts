// Sumber kebenaran untuk enum & bentuk DTO yang dipakai backend (NestJS) dan frontend (React).
// Backend saat ini masih memakai enum bawaan Prisma (@prisma/client) secara langsung;
// migrasi bertahap ke tipe di sini dilakukan mulai Module Instrument agar tidak ada
// dua sumber kebenaran yang tumpang tindih selama Module Area masih baru.

export type AreaStatus = 'ACTIVE' | 'INACTIVE';

export type InstrumentStatus = 'ACTIVE' | 'STANDBY' | 'OUT_OF_SERVICE';

export type Criticality = 'HIGH' | 'MEDIUM' | 'LOW';

export type FailureCategory =
  | 'INSTRUMENT'
  | 'ELECTRICAL'
  | 'MECHANICAL'
  | 'COMMUNICATION'
  | 'CONFIGURATION'
  | 'CALIBRATION'
  | 'PROCESS';

export type MaintenanceStatus = 'OPEN' | 'IN_PROGRESS' | 'COMPLETED';

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
