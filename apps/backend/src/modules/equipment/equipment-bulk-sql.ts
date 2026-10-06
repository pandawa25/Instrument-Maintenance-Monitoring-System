import { randomUUID } from 'node:crypto';

/**
 * UPDATE massal untuk commit Bulk Upload mode UPDATE_OR_CREATE.
 *
 * Kenapa raw SQL: update per baris lewat Prisma = 1 round-trip DB per baris. Untuk ~1000 baris
 * ke DB Railway itu bisa puluhan detik sampai menit (latensi jaringan × jumlah baris) dan
 * menembus batas transaksi. Di sini SATU statement meng-update sampai ratusan baris sekaligus
 * (`UPDATE ... FROM jsonb_to_recordset($1)`), jadi waktu ≈ konstan terhadap jumlah baris.
 *
 * Semantik "cell kosong = jangan disentuh" dipertahankan lewat kolom `f` (set nama field yang
 * terisi di Excel): `CASE WHEN jsonb_exists(v.f, 'x') THEN v.x ELSE e.x END`.
 *
 * Seluruh nilai dikirim sebagai SATU parameter JSON ($1) — tidak ada interpolasi string ke SQL.
 * `updated_at` diisi manual (raw SQL melewati @updatedAt Prisma), dalam UTC seperti Prisma.
 */
export const BULK_UPDATE_SQL = `
UPDATE equipment AS e SET
  area_id = v.area_id,
  instrument_name_id = v.instrument_name_id,
  service = v.service,
  "type" = CASE WHEN jsonb_exists(v.f, 'type') THEN v."type" ELSE e."type" END,
  manufacturer = CASE WHEN jsonb_exists(v.f, 'manufacturer') THEN v.manufacturer ELSE e.manufacturer END,
  model = CASE WHEN jsonb_exists(v.f, 'model') THEN v.model ELSE e.model END,
  serial_number = CASE WHEN jsonb_exists(v.f, 'serial_number') THEN v.serial_number ELSE e.serial_number END,
  installation_date = CASE WHEN jsonb_exists(v.f, 'installation_date') THEN v.installation_date ELSE e.installation_date END,
  lrv = CASE WHEN jsonb_exists(v.f, 'lrv') THEN v.lrv ELSE e.lrv END,
  urv = CASE WHEN jsonb_exists(v.f, 'urv') THEN v.urv ELSE e.urv END,
  unit = CASE WHEN jsonb_exists(v.f, 'unit') THEN v.unit ELSE e.unit END,
  size = CASE WHEN jsonb_exists(v.f, 'size') THEN v.size ELSE e.size END,
  rating = CASE WHEN jsonb_exists(v.f, 'rating') THEN v.rating ELSE e.rating END,
  fail_action = CASE WHEN jsonb_exists(v.f, 'fail_action') THEN v.fail_action::"FailAction" ELSE e.fail_action END,
  status = CASE WHEN jsonb_exists(v.f, 'status') THEN v.status::"EquipmentStatus" ELSE e.status END,
  criticality = CASE WHEN jsonb_exists(v.f, 'criticality') THEN v.criticality::"Criticality" ELSE e.criticality END,
  remarks = CASE WHEN jsonb_exists(v.f, 'remarks') THEN v.remarks ELSE e.remarks END,
  updated_at = (NOW() AT TIME ZONE 'UTC')
FROM jsonb_to_recordset($1::jsonb) AS v(
  id uuid, area_id uuid, instrument_name_id uuid, service text,
  "type" text, manufacturer text, model text, serial_number text, installation_date date,
  lrv numeric, urv numeric, unit text, size text, rating text,
  fail_action text, status text, criticality text, remarks text, f jsonb
)
WHERE e.id = v.id AND e.deleted_at IS NULL
`;

/** Baris hasil resolve yang dibutuhkan builder (subset ResolvedEquipmentRow). */
export interface BulkUpdateInput {
  equipmentId: string;
  resolved: {
    areaId: string;
    instrumentNameId: string;
    service: string;
    type?: string;
    manufacturer?: string;
    model?: string;
    serialNumber?: string;
    installationDate?: string;
    lrv?: number;
    urv?: number;
    unit?: string;
    size?: string;
    rating?: string;
    failAction?: string;
    status?: string;
    criticality?: string;
    remarks?: string;
  };
}

// camelCase (resolved) -> snake_case (kolom). `f` hanya memuat field opsional yang terisi.
const OPTIONAL_FIELDS: [keyof BulkUpdateInput['resolved'], string][] = [
  ['type', 'type'],
  ['manufacturer', 'manufacturer'],
  ['model', 'model'],
  ['serialNumber', 'serial_number'],
  ['installationDate', 'installation_date'],
  ['lrv', 'lrv'],
  ['urv', 'urv'],
  ['unit', 'unit'],
  ['size', 'size'],
  ['rating', 'rating'],
  ['failAction', 'fail_action'],
  ['status', 'status'],
  ['criticality', 'criticality'],
  ['remarks', 'remarks'],
];

/** Pecah ke chunk lalu serialisasi tiap chunk menjadi 1 parameter JSON untuk BULK_UPDATE_SQL. */
export function buildBulkUpdateParams(inputs: BulkUpdateInput[], chunkSize = 500): { json: string; count: number }[] {
  const chunks: { json: string; count: number }[] = [];
  for (let i = 0; i < inputs.length; i += chunkSize) {
    const slice = inputs.slice(i, i + chunkSize);
    const records = slice.map(({ equipmentId, resolved }) => {
      const record: Record<string, unknown> = {
        id: equipmentId,
        area_id: resolved.areaId,
        instrument_name_id: resolved.instrumentNameId,
        service: resolved.service,
      };
      const f: Record<string, true> = {};
      for (const [key, column] of OPTIONAL_FIELDS) {
        const value = resolved[key];
        if (value !== undefined) {
          record[column] = value;
          f[column] = true;
        }
      }
      record.f = f;
      return record;
    });
    chunks.push({ json: JSON.stringify(records), count: slice.length });
  }
  return chunks;
}

// Dipakai test untuk id deterministik-bebas; diekspor agar tidak ada import crypto ganda di spec.
export const newId = (): string => randomUUID();
