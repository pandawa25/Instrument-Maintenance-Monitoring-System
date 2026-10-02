export type SparePartStatus = 'ACTIVE' | 'INACTIVE';

export interface SparePart {
  id: string;
  kimap: string;
  name: string;
  unit: string;
  stock: number;
  minStock: number;
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
  minStock?: number | string;
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
// RESTOCK (Stock In) / STOCK_OUT (Stock Out) / ADJUSTMENT diinput manual oleh Admin.
export type StockMovementType = 'MAINTENANCE_USAGE' | 'MAINTENANCE_RETURN' | 'RESTOCK' | 'STOCK_OUT' | 'ADJUSTMENT';
export type ManualStockMovementType = 'RESTOCK' | 'STOCK_OUT' | 'ADJUSTMENT';

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

// Satu baris spare part referensi, dipakai di ledger lintas-part (Stock In/Out page).
export interface SparePartRef {
  id: string;
  kimap: string;
  name: string;
  unit: string;
}

// Baris ledger lintas spare part — beda dengan StockMovement (yang sudah di-scope ke
// satu sparePartId): baris ini membawa `sparePart` karena ditampilkan lintas material
// di halaman Stock In / Stock Out.
export interface AllStockMovementItem {
  id: string;
  type: StockMovementType;
  quantityDelta: number;
  balanceAfter: number;
  notes: string | null;
  sparePart: SparePartRef;
  createdBy: { id: string; fullName: string };
  createdAt: string;
}

export interface AllStockMovementsQueryParams {
  page: number;
  limit: number;
  search?: string;
  dateFrom?: string;
  dateTo?: string;
}

// Form create Stock In/Out lintas-part — user pilih spare part dulu (beda dengan
// CreateStockMovementPayload yang dipakai saat sparePartId sudah diketahui dari row).
export interface CreateStandaloneMovementPayload {
  sparePartId: string;
  quantityDelta: number;
  notes?: string;
}

export interface InventorySummary {
  totalItems: number;
  activeItems: number;
  totalStockQty: number;
  outOfStockCount: number;
  lowStockCount: number;
}

export interface LowStockItem {
  id: string;
  kimap: string;
  name: string;
  unit: string;
  stock: number;
  minStock: number;
}

export interface MonthlyStockTrend {
  month: string; // "YYYY-MM"
  stockIn: number;
  stockOut: number;
}

export interface InventoryCharts {
  monthlyTrend: MonthlyStockTrend[];
  lowStockItems: LowStockItem[];
}
