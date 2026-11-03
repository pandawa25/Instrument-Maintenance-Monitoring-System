/**
 * UPSERT massal untuk commit import Notification & Work Order — pola sama persis dengan
 * BULK_UPDATE_SQL di equipment-bulk-sql.ts (lihat roadmap.md Risk #21): update/insert per
 * baris lewat Prisma = 1+ round-trip DB per baris, untuk ~700-1000 baris ke DB Railway itu
 * bisa menembus batas waktu transaksi. Di sini SATU statement meng-upsert sampai ratusan
 * baris sekaligus lewat `INSERT ... FROM jsonb_to_recordset($1) ... ON CONFLICT ... DO UPDATE`,
 * ditarget ke partial unique index case-insensitive yang sama dipakai constraint uniqueness
 * notification_no/order_no (lihat migration 20261103000000_work_order_notification).
 *
 * Beda dengan equipment-bulk-sql.ts (UPDATE-only, baris target sudah pasti ada): di sini
 * row BISA baru (create) atau sudah ada (update) — makanya UPSERT (INSERT ON CONFLICT),
 * bukan UPDATE. RETURNING dipakai supaya tidak perlu SELECT tambahan untuk tahu id
 * hasil insert/update (dipakai NotificationUpsertService untuk resolve notification_id
 * saat upsert WorkOrder, dan hitung unmatchedCount).
 *
 * Seluruh nilai dikirim sebagai SATU parameter JSON ($1) per chunk — tidak ada interpolasi
 * string ke SQL.
 */

export const NOTIFICATION_UPSERT_SQL = `
INSERT INTO notifications (
  id, notification_no, equipment_id, equipment_tag_raw, functional_location, plant,
  created_on_erp, import_batch_id, created_at, updated_at
)
SELECT
  v.id, v.notification_no, v.equipment_id, v.equipment_tag_raw, v.functional_location, v.plant,
  v.created_on_erp, v.import_batch_id, (NOW() AT TIME ZONE 'UTC'), (NOW() AT TIME ZONE 'UTC')
FROM jsonb_to_recordset($1::jsonb) AS v(
  id uuid, notification_no text, equipment_id uuid, equipment_tag_raw text,
  functional_location text, plant text, created_on_erp date, import_batch_id uuid
)
ON CONFLICT (UPPER(notification_no)) WHERE deleted_at IS NULL
DO UPDATE SET
  equipment_id = EXCLUDED.equipment_id,
  equipment_tag_raw = EXCLUDED.equipment_tag_raw,
  functional_location = EXCLUDED.functional_location,
  plant = EXCLUDED.plant,
  created_on_erp = EXCLUDED.created_on_erp,
  import_batch_id = EXCLUDED.import_batch_id,
  updated_at = (NOW() AT TIME ZONE 'UTC')
RETURNING id, notification_no
`;

export const WORK_ORDER_UPSERT_SQL = `
INSERT INTO work_orders (
  id, order_no, notification_id, equipment_id, equipment_tag_raw, order_type, maint_activ_type,
  description, functional_location, plant, basic_start_date, basic_fin_date, user_status,
  system_status, lifecycle_stage, import_batch_id, created_at, updated_at
)
SELECT
  v.id, v.order_no, v.notification_id, v.equipment_id, v.equipment_tag_raw, v.order_type, v.maint_activ_type,
  v.description, v.functional_location, v.plant, v.basic_start_date, v.basic_fin_date, v.user_status,
  v.system_status, v.lifecycle_stage::"WorkOrderLifecycleStage", v.import_batch_id,
  (NOW() AT TIME ZONE 'UTC'), (NOW() AT TIME ZONE 'UTC')
FROM jsonb_to_recordset($1::jsonb) AS v(
  id uuid, order_no text, notification_id uuid, equipment_id uuid, equipment_tag_raw text,
  order_type text, maint_activ_type text, description text, functional_location text, plant text,
  basic_start_date date, basic_fin_date date, user_status text, system_status text,
  lifecycle_stage text, import_batch_id uuid
)
ON CONFLICT (UPPER(order_no)) WHERE deleted_at IS NULL
DO UPDATE SET
  notification_id = EXCLUDED.notification_id,
  equipment_id = EXCLUDED.equipment_id,
  equipment_tag_raw = EXCLUDED.equipment_tag_raw,
  order_type = EXCLUDED.order_type,
  maint_activ_type = EXCLUDED.maint_activ_type,
  description = EXCLUDED.description,
  functional_location = EXCLUDED.functional_location,
  plant = EXCLUDED.plant,
  basic_start_date = EXCLUDED.basic_start_date,
  basic_fin_date = EXCLUDED.basic_fin_date,
  user_status = EXCLUDED.user_status,
  system_status = EXCLUDED.system_status,
  lifecycle_stage = EXCLUDED.lifecycle_stage,
  import_batch_id = EXCLUDED.import_batch_id,
  updated_at = (NOW() AT TIME ZONE 'UTC')
RETURNING id, (equipment_id IS NULL) AS unmatched
`;

export interface NotificationUpsertInput {
  id: string;
  notificationNo: string;
  equipmentId?: string;
  equipmentTagRaw?: string;
  functionalLocation?: string;
  plant?: string;
  createdOnErp?: string;
  importBatchId: string;
}

export interface WorkOrderUpsertInput {
  id: string;
  orderNo: string;
  notificationId?: string;
  equipmentId?: string;
  equipmentTagRaw?: string;
  orderType?: string;
  maintActivType?: string;
  description: string;
  functionalLocation?: string;
  plant?: string;
  basicStartDate?: string;
  basicFinDate?: string;
  userStatus?: string;
  systemStatus?: string;
  lifecycleStage: string;
  importBatchId: string;
}

function chunk<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) chunks.push(items.slice(i, i + size));
  return chunks;
}

export function buildNotificationUpsertParams(inputs: NotificationUpsertInput[], chunkSize = 500): string[] {
  return chunk(inputs, chunkSize).map((slice) =>
    JSON.stringify(
      slice.map((i) => ({
        id: i.id,
        notification_no: i.notificationNo,
        equipment_id: i.equipmentId ?? null,
        equipment_tag_raw: i.equipmentTagRaw ?? null,
        functional_location: i.functionalLocation ?? null,
        plant: i.plant ?? null,
        created_on_erp: i.createdOnErp ?? null,
        import_batch_id: i.importBatchId,
      })),
    ),
  );
}

export function buildWorkOrderUpsertParams(inputs: WorkOrderUpsertInput[], chunkSize = 500): string[] {
  return chunk(inputs, chunkSize).map((slice) =>
    JSON.stringify(
      slice.map((i) => ({
        id: i.id,
        order_no: i.orderNo,
        notification_id: i.notificationId ?? null,
        equipment_id: i.equipmentId ?? null,
        equipment_tag_raw: i.equipmentTagRaw ?? null,
        order_type: i.orderType ?? null,
        maint_activ_type: i.maintActivType ?? null,
        description: i.description,
        functional_location: i.functionalLocation ?? null,
        plant: i.plant ?? null,
        basic_start_date: i.basicStartDate ?? null,
        basic_fin_date: i.basicFinDate ?? null,
        user_status: i.userStatus ?? null,
        system_status: i.systemStatus ?? null,
        lifecycle_stage: i.lifecycleStage,
        import_batch_id: i.importBatchId,
      })),
    ),
  );
}
