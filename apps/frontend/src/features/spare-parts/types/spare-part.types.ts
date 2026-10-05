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

// Sumber baris ledger yang berasal dari Corrective Maintenance (null untuk input manual).
export interface StockMovementReference {
  type: 'CORRECTIVE_MAINTENANCE';
  id: string;
  /** No. e-SPK CM (fallback tag equipment). */
  label: string;
  /** CM-nya sudah dihapus — link ke detail tidak lagi valid. */
  deleted: boolean;
}

export interface StockMovement {
  id: string;
  type: StockMovementType;
  quantityDelta: number;
  balanceAfter: number;
  /** Tanggal transaksi (yyyy-mm-dd) — beda dengan createdAt (waktu input ke sistem). */
  movementDate: string;
  referenceType: string | null;
  referenceId: string | null;
  reference: StockMovementReference | null;
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
  /** yyyy-mm-dd; kosong = hari ini. Tidak boleh di masa depan. */
  movementDate?: string;
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
  movementDate: string;
  reference: StockMovementReference | null;
  notes: string | null;
  sparePart: SparePartRef;
  createdBy: { id: string; fullName: string };
  createdAt: string;
}

// Khusus halaman Stock Out: ALL (default) | MANUAL (input manual) | MAINTENANCE (pemakaian Corrective Maintenance).
export type StockOutSource = 'ALL' | 'MANUAL' | 'MAINTENANCE';

export interface AllStockMovementsQueryParams {
  page: number;
  limit: number;
  search?: string;
  source?: StockOutSource;
  dateFrom?: string;
  dateTo?: string;
}

// Form create Stock In/Out lintas-part — user pilih spare part dulu (beda dengan
// CreateStockMovementPayload yang dipakai saat sparePartId sudah diketahui dari row).
export interface CreateStandaloneMovementPayload {
  sparePartId: string;
  quantityDelta: number;
  movementDate?: string;
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
