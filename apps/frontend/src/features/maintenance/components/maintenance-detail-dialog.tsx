import { Wrench } from 'lucide-react';
import { DetailDialog, type DetailField } from '@/components/shared/detail-dialog';
import { StatusBadge } from '@/components/shared/status-badge';
import { AttachmentsSection } from '@/features/attachments/components/attachments-section';
import type { Maintenance } from '../types/maintenance.types';

const FAILURE_CATEGORY_LABEL: Record<Maintenance['failureCategory'], string> = {
  INSTRUMENT: 'Instrument',
  ELECTRICAL: 'Electrical',
  MECHANICAL: 'Mechanical',
  COMMUNICATION: 'Communication',
  CONFIGURATION: 'Configuration',
  CALIBRATION: 'Calibration',
  PROCESS: 'Process',
};

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  maintenance: Maintenance | null;
  canEdit: boolean;
}

export function MaintenanceDetailDialog({ open, onOpenChange, maintenance, canEdit }: Props) {
  if (!maintenance) return null;

  // Referensi ERP semuanya opsional/manual — section ini cuma ditampilkan kalau ada
  // minimal satu yang terisi, supaya tidak jadi 6 box "—" kosong di mayoritas record
  // yang belum ada notifikasi/WO-nya.
  const hasErpInfo = Boolean(
    maintenance.notificationNumber ||
      maintenance.notificationDate ||
      maintenance.notificationStatus ||
      maintenance.workOrderNumber ||
      maintenance.workOrderDate ||
      maintenance.workOrderStatus,
  );

  const fields: DetailField[] = [
    // --- Info Utama ---
    { section: 'Info Utama', label: 'No. e-SPK', value: maintenance.spkNumber },
    { section: 'Info Utama', label: 'Maintenance Date', value: new Date(maintenance.maintenanceDate).toLocaleDateString('id-ID') },
    {
      section: 'Info Utama',
      label: 'Equipment',
      value: `${maintenance.equipment.tagNumber} — ${maintenance.equipment.service}`,
    },
    { section: 'Info Utama', label: 'Area', value: `${maintenance.area.areaCode} — ${maintenance.area.areaName}` },
    { section: 'Info Utama', label: 'Failure Category', value: FAILURE_CATEGORY_LABEL[maintenance.failureCategory] },
    { section: 'Info Utama', label: 'Technician / PIC', value: maintenance.technician.fullName },
    {
      section: 'Info Utama',
      label: 'Technician Tambahan',
      value:
        maintenance.additionalTechnicians.length > 0
          ? maintenance.additionalTechnicians.map((t) => t.fullName).join(', ')
          : null,
    },

    // --- Problem & Tindakan ---
    { section: 'Problem & Tindakan', label: 'Problem Description', value: maintenance.problemDescription, fullWidth: true },
    { section: 'Problem & Tindakan', label: 'Root Cause', value: maintenance.rootCause, fullWidth: true },
    { section: 'Problem & Tindakan', label: 'Action Taken', value: maintenance.actionTaken, fullWidth: true },
    {
      section: 'Problem & Tindakan',
      label: 'Downtime Hours',
      value: maintenance.downtimeHours !== null ? `${maintenance.downtimeHours} jam` : null,
    },
    {
      section: 'Problem & Tindakan',
      label: 'Completion Date',
      value: maintenance.completionDate ? new Date(maintenance.completionDate).toLocaleDateString('id-ID') : null,
    },
    { section: 'Problem & Tindakan', label: 'Remarks', value: maintenance.remarks, fullWidth: true },

    // --- Material ---
    {
      section: 'Material',
      label: 'Butuh Spare Part / Material',
      value: maintenance.needsSparePart ? 'Ya' : 'Tidak',
    },
    {
      section: 'Material',
      label: 'Kebutuhan Material',
      fullWidth: true,
      value:
        maintenance.needsSparePart && maintenance.materials.length > 0 ? (
          <ul className="list-inside list-disc space-y-0.5">
            {maintenance.materials.map((m) => (
              <li key={m.id}>
                {m.sparePart.kimap} — {m.sparePart.name} : {m.quantity} {m.sparePart.unit}
                {m.remarks ? ` (${m.remarks})` : ''}
              </li>
            ))}
          </ul>
        ) : null,
    },

    // --- Referensi ERP (hanya kalau ada isinya) ---
    ...(hasErpInfo
      ? ([
          { section: 'Referensi Notifikasi & WO (ERP)', label: 'No. Notifikasi', value: maintenance.notificationNumber },
          {
            section: 'Referensi Notifikasi & WO (ERP)',
            label: 'Tanggal Notifikasi',
            value: maintenance.notificationDate
              ? new Date(maintenance.notificationDate).toLocaleDateString('id-ID')
              : null,
          },
          { section: 'Referensi Notifikasi & WO (ERP)', label: 'Status Notifikasi', value: maintenance.notificationStatus },
          { section: 'Referensi Notifikasi & WO (ERP)', label: 'No. Work Order', value: maintenance.workOrderNumber },
          {
            section: 'Referensi Notifikasi & WO (ERP)',
            label: 'Tanggal WO',
            value: maintenance.workOrderDate ? new Date(maintenance.workOrderDate).toLocaleDateString('id-ID') : null,
          },
          { section: 'Referensi Notifikasi & WO (ERP)', label: 'Status WO', value: maintenance.workOrderStatus },
        ] satisfies DetailField[])
      : []),

    // --- Audit trail (ringan, tanpa box) ---
    { section: 'Audit', label: 'Dicatat Oleh', value: maintenance.createdBy.fullName, compact: true },
    { section: 'Audit', label: 'Dibuat Pada', value: new Date(maintenance.createdAt).toLocaleString('id-ID'), compact: true },
    { section: 'Audit', label: 'Terakhir Diubah', value: new Date(maintenance.updatedAt).toLocaleString('id-ID'), compact: true },
  ];

  return (
    <DetailDialog
      open={open}
      onOpenChange={onOpenChange}
      icon={Wrench}
      title="Detail Corrective Maintenance"
      subtitle={maintenance.equipment.tagNumber}
      fields={fields}
      headerContent={
        <div className="-mt-2 flex items-center gap-2">
          <StatusBadge value={maintenance.status} />
          <StatusBadge value={maintenance.priority} />
        </div>
      }
    >
      <div className="mt-4 border-t border-border/60 pt-4">
        <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-text-muted">Lampiran</h4>
        <AttachmentsSection entityType="CORRECTIVE_MAINTENANCE" entityId={maintenance.id} canEdit={canEdit} />
      </div>
    </DetailDialog>
  );
}
