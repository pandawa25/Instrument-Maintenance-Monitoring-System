import { useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Pencil, Wrench } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { PageHeader } from '@/components/shared/page-header';
import { LoadingState } from '@/components/shared/loading-state';
import { EmptyState } from '@/components/shared/empty-state';
import { StatusBadge } from '@/components/shared/status-badge';
import { DetailFieldsGrid, type DetailField } from '@/components/shared/detail-fields-grid';
import { AttachmentsSection } from '@/features/attachments/components/attachments-section';
import { useMaintenanceById } from '../hooks/use-maintenance';
import { MaintenanceForm } from '../components/maintenance-form';
import { useAuthStore } from '@/store/auth.store';
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

// Halaman View/Edit Corrective Maintenance (1 URL, mode toggle) — menggantikan
// MaintenanceDetailDialog + MaintenanceFormDialog (mode edit) yang sebelumnya dipakai
// dari list page. Dipindah ke halaman penuh karena kontennya paling berat di aplikasi
// (6 section + lampiran di detail, ±529 baris form) — lihat roadmap Risk register.
//
// Dibuka dari MaintenanceListPage: tombol "View" -> mode 'view' (default), tombol "Edit"
// -> navigate dengan state { mode: 'edit' } supaya langsung masuk mode form.
export function MaintenanceDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const role = useAuthStore((s) => s.user?.role);
  const canEdit = role === 'Admin';

  const [mode, setMode] = useState<'view' | 'edit'>(
    (location.state as { mode?: 'view' | 'edit' } | null)?.mode === 'edit' && canEdit ? 'edit' : 'view',
  );

  const { data: maintenance, isLoading } = useMaintenanceById(id);

  function backToList() {
    navigate('/maintenance');
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" onClick={backToList}>
          <ArrowLeft className="h-4 w-4" />
          Kembali ke Daftar Corrective Maintenance
        </Button>
        <Card>
          <LoadingState />
        </Card>
      </div>
    );
  }

  if (!maintenance) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" onClick={backToList}>
          <ArrowLeft className="h-4 w-4" />
          Kembali ke Daftar Corrective Maintenance
        </Button>
        <Card>
          <EmptyState icon={Wrench} message="Data maintenance tidak ditemukan — mungkin sudah dihapus." />
        </Card>
      </div>
    );
  }

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
    { section: 'Info Utama', label: 'No. e-SPK', value: maintenance.spkNumber },
    { section: 'Info Utama', label: 'Maintenance Date', value: new Date(maintenance.maintenanceDate).toLocaleDateString('id-ID') },
    { section: 'Info Utama', label: 'Equipment', value: `${maintenance.equipment.tagNumber} — ${maintenance.equipment.service}` },
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

    { section: 'Audit', label: 'Dicatat Oleh', value: maintenance.createdBy.fullName, compact: true },
    { section: 'Audit', label: 'Dibuat Pada', value: new Date(maintenance.createdAt).toLocaleString('id-ID'), compact: true },
    { section: 'Audit', label: 'Terakhir Diubah', value: new Date(maintenance.updatedAt).toLocaleString('id-ID'), compact: true },
  ];

  return (
    <div className="space-y-4">
      <Button variant="ghost" onClick={backToList}>
        <ArrowLeft className="h-4 w-4" />
        Kembali ke Daftar Corrective Maintenance
      </Button>

      <PageHeader
        icon={Wrench}
        title={maintenance.spkNumber || maintenance.equipment.tagNumber}
        description={maintenance.equipment.tagNumber}
        action={
          mode === 'view' && canEdit ? (
            <Button onClick={() => setMode('edit')}>
              <Pencil className="h-4 w-4" />
              Edit
            </Button>
          ) : undefined
        }
      />

      <Card className="p-5">
        {mode === 'view' ? (
          <>
            <div className="mb-4 flex items-center gap-2">
              <StatusBadge value={maintenance.status} />
              <StatusBadge value={maintenance.priority} />
            </div>
            <DetailFieldsGrid fields={fields} />
            <div className="mt-4 border-t border-border/60 pt-4">
              <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-text-muted">Lampiran</h4>
              <AttachmentsSection entityType="CORRECTIVE_MAINTENANCE" entityId={maintenance.id} canEdit={canEdit} />
            </div>
          </>
        ) : (
          <MaintenanceForm maintenance={maintenance} onSuccess={() => setMode('view')} onCancel={() => setMode('view')} />
        )}
      </Card>
    </div>
  );
}
