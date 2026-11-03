import { useState } from 'react';
import { ClipboardList, LinkIcon, Unlink } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { DetailDialog, type DetailField } from '@/components/shared/detail-dialog';
import { StatusBadge } from '@/components/shared/status-badge';
import { Button } from '@/components/ui/button';
import { useWorkOrderById } from '../hooks/use-work-orders';
import { usePermission } from '@/store/auth.store';
import { LinkEquipmentDialog } from './link-equipment-dialog';

interface Props {
  workOrderId: string | null;
  onOpenChange: (open: boolean) => void;
}

function fmtDate(value: string | null) {
  return value ? new Date(value).toLocaleDateString('id-ID') : null;
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
      />

      {wo && <LinkEquipmentDialog open={linkOpen} onOpenChange={setLinkOpen} workOrder={wo} />}
    </>
  );
}
