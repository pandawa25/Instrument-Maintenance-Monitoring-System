export type SparePartStatus = 'ACTIVE' | 'INACTIVE';

export interface SparePart {
  id: string;
  kimap: string;
  name: string;
  unit: string;
  stock: number;
  status: SparePartStatus;
  remarks: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SparePartFormValues {
  kimap: string;
  name: string;
  unit: string;
  stock: number | string;
  status: SparePartStatus;
  remarks?: string;
}

export interface SparePartQueryParams {
  page: number;
  limit: number;
  search?: string;
  status?: SparePartStatus | '';
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

// Ledger pergerakan stock — sumber kebenaran (source of truth) untuk stock.
// MAINTENANCE_USAGE/MAINTENANCE_RETURN otomatis dari Corrective Maintenance;
// RESTOCK/ADJUSTMENT diinput manual oleh Admin.
export type StockMovementType = 'MAINTENANCE_USAGE' | 'MAINTENANCE_RETURN' | 'RESTOCK' | 'ADJUSTMENT';
export type ManualStockMovementType = 'RESTOCK' | 'ADJUSTMENT';

export interface StockMovement {
  id: string;
  type: StockMovementType;
  quantityDelta: number;
  balanceAfter: number;
  referenceType: string | null;
  referenceId: string | null;
  notes: string | null;
  createdBy: { id: string; fullName: string };
  createdAt: string;
}

export interface StockMovementQueryParams {
  page: number;
  limit: number;
}

export interface CreateStockMovementPayload {
  type: ManualStockMovementType;
  quantityDelta: number;
  notes?: string;
}
