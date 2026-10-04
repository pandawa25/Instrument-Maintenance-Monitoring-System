import { useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Gauge, Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { PageHeader } from '@/components/shared/page-header';
import { LoadingState } from '@/components/shared/loading-state';
import { EmptyState } from '@/components/shared/empty-state';
import { StatusBadge } from '@/components/shared/status-badge';
import { DetailFieldsGrid, type DetailField } from '@/components/shared/detail-fields-grid';
import { useEquipmentById } from '../hooks/use-equipment';
import { EquipmentForm } from '../components/equipment-form';
import { usePermission } from '@/store/auth.store';
import { FAIL_ACTION_LABEL, isValveInstrumentCode } from '../types/equipment.types';

// Halaman View/Edit Equipment (1 URL, mode toggle) — menggantikan EquipmentDetailDialog +
// EquipmentFormDialog (mode edit) yang sebelumnya dipakai dari list page. Dipindah ke
// halaman penuh karena form-nya besar (±400 baris) dan supaya record bisa di-share lewat
// link langsung (deep link) — lihat roadmap Risk register untuk alasan lengkap.
//
// Dibuka dari EquipmentListPage: tombol "View" -> mode 'view' (default), tombol "Edit"
// -> navigate dengan state { mode: 'edit' } supaya langsung masuk mode form.
export function EquipmentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const canEdit = usePermission('EQUIPMENT', 'edit');

  const [mode, setMode] = useState<'view' | 'edit'>(
    (location.state as { mode?: 'view' | 'edit' } | null)?.mode === 'edit' && canEdit ? 'edit' : 'view',
  );

  const { data: equipment, isLoading } = useEquipmentById(id);

  function backToList() {
    navigate('/equipment');
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" onClick={backToList}>
          <ArrowLeft className="h-4 w-4" />
          Kembali ke Daftar Equipment
        </Button>
        <Card>
          <LoadingState />
        </Card>
      </div>
    );
  }

  if (!equipment) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" onClick={backToList}>
          <ArrowLeft className="h-4 w-4" />
          Kembali ke Daftar Equipment
        </Button>
        <Card>
          <EmptyState icon={Gauge} message="Equipment tidak ditemukan — mungkin sudah dihapus." />
        </Card>
      </div>
    );
  }

  const isValve = isValveInstrumentCode(equipment.instrumentName.code);

  // Equipment valve (CV/SV/KV/UV) pakai Size/Rating/Fail Action; equipment lain pakai
  // LRV/URV/Unit — lihat revisi "Module Equipment valve fields".
  const valveOrRangeFields: DetailField[] = isValve
    ? [
        { label: 'Size', value: equipment.size },
        { label: 'Rating', value: equipment.rating },
        { label: 'Fail Action', value: equipment.failAction ? FAIL_ACTION_LABEL[equipment.failAction] : null },
      ]
    : [
        { label: 'LRV', value: equipment.lrv !== null && equipment.lrv !== undefined ? String(equipment.lrv) : null },
        { label: 'URV', value: equipment.urv !== null && equipment.urv !== undefined ? String(equipment.urv) : null },
        { label: 'Unit', value: equipment.unit },
      ];

  const fields: DetailField[] = [
    { section: 'Info Utama', label: 'Tag Number', value: equipment.tagNumber },
    { section: 'Info Utama', label: 'Service', value: equipment.service },
    { section: 'Info Utama', label: 'Area', value: `${equipment.area.areaCode} — ${equipment.area.areaName}` },
    { section: 'Info Utama', label: 'Instrument Name', value: equipment.instrumentName.name },
    { section: 'Info Utama', label: 'Description', value: equipment.description, fullWidth: true },

    { section: 'Spesifikasi Teknis', label: 'Type', value: equipment.type },
    { section: 'Spesifikasi Teknis', label: 'Manufacturer', value: equipment.manufacturer },
    { section: 'Spesifikasi Teknis', label: 'Model', value: equipment.model },
    { section: 'Spesifikasi Teknis', label: 'Serial Number', value: equipment.serialNumber },
    {
      section: 'Spesifikasi Teknis',
      label: 'Installation Date',
      value: equipment.installationDate ? new Date(equipment.installationDate).toLocaleDateString('id-ID') : null,
    },
    ...valveOrRangeFields.map((f) => ({ ...f, section: 'Spesifikasi Teknis' })),

    {
      section: 'Status & Catatan',
      label: 'Last Maintenance',
      value: equipment.lastMaintenanceDate
        ? new Date(equipment.lastMaintenanceDate).toLocaleDateString('id-ID')
        : null,
    },
    { section: 'Status & Catatan', label: 'Remarks', value: equipment.remarks, fullWidth: true },

    { section: 'Audit', label: 'Dibuat Pada', value: new Date(equipment.createdAt).toLocaleString('id-ID'), compact: true },
    { section: 'Audit', label: 'Terakhir Diubah', value: new Date(equipment.updatedAt).toLocaleString('id-ID'), compact: true },
  ];

  return (
    <div className="space-y-4">
      <Button variant="ghost" onClick={backToList}>
        <ArrowLeft className="h-4 w-4" />
        Kembali ke Daftar Equipment
      </Button>

      <PageHeader
        icon={Gauge}
        title={equipment.tagNumber}
        description={equipment.service}
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
              <StatusBadge value={equipment.status} />
              <StatusBadge value={equipment.criticality} />
            </div>
            <DetailFieldsGrid fields={fields} />
          </>
        ) : (
          <EquipmentForm equipment={equipment} onSuccess={() => setMode('view')} onCancel={() => setMode('view')} />
        )}
      </Card>
    </div>
  );
}
