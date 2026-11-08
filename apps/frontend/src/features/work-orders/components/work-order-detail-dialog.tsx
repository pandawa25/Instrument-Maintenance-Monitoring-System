import { useEffect, useState } from 'react';
import { ClipboardList, LinkIcon, Unlink } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { DetailDialog, type DetailField } from '@/components/shared/detail-dialog';
import { StatusBadge } from '@/components/shared/status-badge';
import { Button } from '@/components/ui/button';
import { useUpdateWorkOrderRemarks, useWorkOrderById } from '../hooks/use-work-orders';
import { usePermission } from '@/store/auth.store';
import { LinkEquipmentDialog } from './link-equipment-dialog';
import { getErrorMessage } from '@/lib/axios';
import type { WorkOrderDetail } from '../types/work-order.types';

interface Props {
  workOrderId: string | null;
  onOpenChange: (open: boolean) => void;
}

function fmtDate(value: string | null) {
  return value ? new Date(value).toLocaleDateString('id-ID') : null;
}

// Catatan manual internal (BUKAN field ERP) — satu-satunya field yang bisa diedit di dialog
// detail ini, makanya dipisah dari DetailFieldsGrid (read-only) lewat slot `children`.
// Editable untuk role dengan permission WORK_ORDER 'edit' (Admin & Teknisi default di seed.ts),
// view-only untuk role lain (ditampilkan sebagai teks biasa).
function RemarksSection({ workOrder, canEdit }: { workOrder: WorkOrderDetail; canEdit: boolean }) {
  const [value, setValue] = useState(workOrder.remarks ?? '');
  const updateMutation = useUpdateWorkOrderRemarks();

  // Sinkron ulang kalau WO yang dibuka berganti (atau data terbaru masuk setelah invalidate).
  useEffect(() => {
    setValue(workOrder.remarks ?? '');
  }, [workOrder.id, workOrder.remarks]);

  const isDirty = value !== (workOrder.remarks ?? '');

  async function handleSave() {
    try {
      await updateMutation.mutateAsync({ id: workOrder.id, remarks: value.trim() || null });
      toast.success('Catatan berhasil disimpan');
    } catch (err: any) {
      toast.error(getErrorMessage(err, 'Gagal menyimpan catatan'));
    }
  }

  return (
    <div className="border-t border-border pt-4">
      <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-text-muted">Catatan / Remarks</p>
      {canEdit ? (
        <div className="space-y-2">
          <textarea
            value={value}
            onChange={(e) => setValue(e.target.value)}
            maxLength={1000}
            rows={3}
            placeholder="Tulis catatan internal terkait Work Order ini (tidak berasal dari ERP)..."
            className="w-full resize-none rounded-md border border-border bg-surface px-3 py-2 text-sm text-text placeholder:text-text-muted/70 focus:border-primary focus:outline-none"
          />
          {isDirty && (
            <div className="flex justify-end gap-2">
              <Button size="sm" variant="ghost" onClick={() => setValue(workOrder.remarks ?? '')}>
                Batal
              </Button>
              <Button size="sm" onClick={handleSave} disabled={updateMutation.isPending}>
                {updateMutation.isPending ? 'Menyimpan...' : 'Simpan Catatan'}
              </Button>
            </div>
          )}
        </div>
      ) : (
        <p className="whitespace-pre-wrap text-sm text-text">{workOrder.remarks || '—'}</p>
      )}
    </div>
  );
}

// Dialog detail read-only (field flat, <10 — pola sama dengan Area/Vendor/Spare Part, lihat
// roadmap Risk #16) + aksi "Hubungkan Equipment" kalau belum ter-link ke equipment manapun.
export function WorkOrderDetailDialog({ workOrderId, onOpenChange }: Props) {
  const navigate = useNavigate();
  const canEdit = usePermission('WORK_ORDER', 'edit');
  const [linkOpen, setLinkOpen] = useState(false);
  const { data: wo, isLoading } = useWorkOrderById(workOrderId ?? undefined);

  if (!workOrderId) return null;

  const fields: DetailField[] = wo
    ? [
        { section: 'Identitas', label: 'No. Notification', value: wo.notification?.notificationNo },
        { section: 'Identitas', label: 'No. Order', value: wo.orderNo },
        { section: 'Identitas', label: 'Order Type', value: wo.orderType },
        { section: 'Identitas', label: 'Deskripsi', value: wo.description, fullWidth: true },

        { section: 'Lokasi', label: 'Equipment', value: wo.equipment?.tagNumber ?? wo.equipmentTagRaw },
        { section: 'Lokasi', label: 'Area', value: wo.equipment ? `${wo.equipment.area.areaCode} — ${wo.equipment.area.areaName}` : null },
        { section: 'Lokasi', label: 'Functional Loc.', value: wo.functionalLocation },

        { section: 'Jadwal', label: 'Basic Start Date', value: fmtDate(wo.basicStartDate) },
        { section: 'Jadwal', label: 'Basic Finish Date', value: fmtDate(wo.basicFinDate) },

        { section: 'Status ERP', label: 'User Status', value: wo.userStatus },
        { section: 'Status ERP', label: 'System Status', value: wo.systemStatus },

        ...(wo.correctiveMaintenance.length > 0
          ? [
              {
                section: 'Terkait',
                label: 'Corrective Maintenance',
                value: wo.correctiveMaintenance
                  .map((cm) => cm.spkNumber || new Date(cm.maintenanceDate).toLocaleDateString('id-ID'))
                  .join(', '),
                fullWidth: true,
              },
            ]
          : []),
      ]
    : [];

  return (
    <>
      <DetailDialog
        open={Boolean(workOrderId)}
        onOpenChange={onOpenChange}
        title={wo?.orderNo ?? '...'}
        subtitle={isLoading ? 'Memuat...' : wo?.description}
        icon={ClipboardList}
        fields={fields}
        headerContent={
          wo && (
            <div className="flex items-center gap-2">
              <StatusBadge value={wo.lifecycleStage} />
              {wo.equipment ? (
                <span className="inline-flex items-center gap-1 text-xs text-success">
                  <LinkIcon className="h-3 w-3" />
                  Terhubung ke equipment
                  {wo.equipmentLinkSource === 'MANUAL' && (
                    <span
                      className="text-text-muted"
                      title="Dihubungkan manual — tidak akan ditimpa saat import ERP berikutnya"
                    >
                      (manual)
                    </span>
                  )}
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-xs text-warning">
                  <Unlink className="h-3 w-3" /> Belum terhubung
                </span>
              )}
              {canEdit && (
                <Button size="sm" variant="outline" className="h-6 px-2 text-xs" onClick={() => setLinkOpen(true)}>
                  {wo.equipment ? 'Ganti Equipment' : 'Hubungkan Equipment'}
                </Button>
              )}
              {wo.equipment && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-6 px-2 text-xs"
                  onClick={() => navigate(`/equipment/${wo.equipment!.id}`)}
                >
                  Lihat Equipment
                </Button>
              )}
            </div>
          )
        }
      >
        {wo && <RemarksSection workOrder={wo} canEdit={canEdit} />}
      </DetailDialog>

      {wo && <LinkEquipmentDialog open={linkOpen} onOpenChange={setLinkOpen} workOrder={wo} />}
    </>
  );
}
