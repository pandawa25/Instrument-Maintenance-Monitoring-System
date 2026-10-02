import { useEffect, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { SearchableSelect } from '@/components/shared/searchable-select';
import { Textarea } from '@/components/ui/textarea';
import { useCreateMaintenance, useUpdateMaintenance } from '../hooks/use-maintenance';
import {
  useEquipmentLookup,
  useSparePartsLookupForMaintenance,
  useTechniciansLookup,
} from '../hooks/use-maintenance-lookups';
import type { Maintenance, MaintenanceFormValues, MaterialFormItem } from '../types/maintenance.types';
import { getErrorMessage } from '@/lib/axios';

const EMPTY_FORM: MaintenanceFormValues = {
  spkNumber: '',
  maintenanceDate: '',
  equipmentId: '',
  failureCategory: 'INSTRUMENT',
  problemDescription: '',
  rootCause: '',
  actionTaken: '',
  downtimeHours: '',
  technicianId: '',
  additionalTechnicianIds: [],
  priority: 'MEDIUM',
  status: 'OPEN',
  completionDate: '',
  remarks: '',
  needsSparePart: false,
  materials: [],
  notificationNumber: '',
  notificationDate: '',
  notificationStatus: '',
  workOrderNumber: '',
  workOrderDate: '',
  workOrderStatus: '',
};

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  maintenance?: Maintenance | null; // null/undefined = mode create
}

export function MaintenanceFormDialog({ open, onOpenChange, maintenance }: Props) {
  const [form, setForm] = useState<MaintenanceFormValues>(EMPTY_FORM);
  const createMutation = useCreateMaintenance();
  const updateMutation = useUpdateMaintenance();
  const { data: equipmentOptions } = useEquipmentLookup();
  const { data: technicians } = useTechniciansLookup();
  const { data: sparePartOptions } = useSparePartsLookupForMaintenance();
  const isEdit = Boolean(maintenance);
  const isSaving = createMutation.isPending || updateMutation.isPending;

  useEffect(() => {
    if (open) {
      setForm(
        maintenance
          ? {
              spkNumber: maintenance.spkNumber ?? '',
              maintenanceDate: maintenance.maintenanceDate.slice(0, 10),
              equipmentId: maintenance.equipment.id,
              failureCategory: maintenance.failureCategory,
              problemDescription: maintenance.problemDescription,
              rootCause: maintenance.rootCause ?? '',
              actionTaken: maintenance.actionTaken ?? '',
              downtimeHours: maintenance.downtimeHours ?? '',
              technicianId: maintenance.technician.id,
              additionalTechnicianIds: maintenance.additionalTechnicians.map((t) => t.id),
              priority: maintenance.priority,
              status: maintenance.status,
              completionDate: maintenance.completionDate?.slice(0, 10) ?? '',
              remarks: maintenance.remarks ?? '',
              needsSparePart: maintenance.needsSparePart,
              materials: maintenance.materials.map((m) => ({
                sparePartId: m.sparePart.id,
                quantity: m.quantity,
                remarks: m.remarks ?? undefined,
              })),
              notificationNumber: maintenance.notificationNumber ?? '',
              notificationDate: maintenance.notificationDate?.slice(0, 10) ?? '',
              notificationStatus: maintenance.notificationStatus ?? '',
              workOrderNumber: maintenance.workOrderNumber ?? '',
              workOrderDate: maintenance.workOrderDate?.slice(0, 10) ?? '',
              workOrderStatus: maintenance.workOrderStatus ?? '',
            }
          : EMPTY_FORM,
      );
    }
  }, [open, maintenance]);

  function addMaterialRow() {
    setForm((f) => ({ ...f, materials: [...f.materials, { sparePartId: '', quantity: 1, remarks: '' }] }));
  }

  function removeMaterialRow(index: number) {
    setForm((f) => ({ ...f, materials: f.materials.filter((_, i) => i !== index) }));
  }

  function updateMaterialRow(index: number, patch: Partial<MaterialFormItem>) {
    setForm((f) => ({
      ...f,
      materials: f.materials.map((m, i) => (i === index ? { ...m, ...patch } : m)),
    }));
  }

  function toggleAdditionalTechnician(technicianId: string, checked: boolean) {
    setForm((f) => ({
      ...f,
      additionalTechnicianIds: checked
        ? [...f.additionalTechnicianIds, technicianId]
        : f.additionalTechnicianIds.filter((id) => id !== technicianId),
    }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (form.needsSparePart && form.materials.some((m) => !m.sparePartId)) {
      toast.error('Pilih spare part untuk setiap baris material, atau hapus baris yang kosong');
      return;
    }

    try {
      const payload: MaintenanceFormValues = {
        ...form,
        spkNumber: form.spkNumber.trim(),
        downtimeHours: form.downtimeHours === '' ? undefined : Number(form.downtimeHours),
        completionDate: form.completionDate || undefined,
        rootCause: form.rootCause || undefined,
        actionTaken: form.actionTaken || undefined,
        remarks: form.remarks || undefined,
        // Jaga-jaga: technician utama tidak boleh nyempil di daftar tambahan
        // (mis. sempat dipilih sebagai tambahan, lalu diganti jadi utama).
        additionalTechnicianIds: form.additionalTechnicianIds.filter((id) => id !== form.technicianId),
        notificationNumber: form.notificationNumber || undefined,
        notificationDate: form.notificationDate || undefined,
        notificationStatus: form.notificationStatus || undefined,
        workOrderNumber: form.workOrderNumber || undefined,
        workOrderDate: form.workOrderDate || undefined,
        workOrderStatus: form.workOrderStatus || undefined,
        materials: form.needsSparePart
          ? form.materials.map((m) => ({
              sparePartId: m.sparePartId,
              quantity: Number(m.quantity) || 0,
              remarks: m.remarks || undefined,
            }))
          : [],
      };
      if (isEdit && maintenance) {
        await updateMutation.mutateAsync({ id: maintenance.id, payload });
        toast.success('Data maintenance berhasil diperbarui');
      } else {
        await createMutation.mutateAsync(payload);
        toast.success('Data maintenance berhasil ditambahkan');
      }
      onOpenChange(false);
    } catch (err: any) {
      toast.error(getErrorMessage(err, 'Gagal menyimpan data maintenance'));
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Corrective Maintenance' : 'Tambah Corrective Maintenance'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <Label htmlFor="spkNumber">No. e-SPK</Label>
            <Input
              id="spkNumber"
              value={form.spkNumber}
              onChange={(e) => setForm({ ...form, spkNumber: e.target.value })}
              placeholder="mis. ESPK-2026-0001"
              maxLength={50}
              className="font-mono"
              required
            />
            <p className="mt-1 text-xs text-text-muted">
              Salin nomor e-SPK dari aplikasi e-SPK (sistem ini tidak generate otomatis).
            </p>
          </div>

          <div>
            <Label htmlFor="maintenanceDate">Maintenance Date</Label>
            <Input
              id="maintenanceDate"
              type="date"
              value={form.maintenanceDate}
              onChange={(e) => setForm({ ...form, maintenanceDate: e.target.value })}
              required
            />
          </div>

          <div>
            <Label htmlFor="equipmentId">Equipment</Label>
            <SearchableSelect
              id="equipmentId"
              value={form.equipmentId}
              onChange={(equipmentId) => setForm({ ...form, equipmentId })}
              options={(equipmentOptions ?? []).map((item) => ({
                value: item.id,
                label: item.tagNumber,
                sublabel: item.service,
              }))}
              placeholder="Pilih equipment..."
              searchPlaceholder="Cari tag number / service..."
              emptyText="Tidak ada equipment yang cocok."
              required
            />
          </div>

          <div>
            <Label htmlFor="failureCategory">Failure Category</Label>
            <Select
              id="failureCategory"
              value={form.failureCategory}
              onChange={(e) =>
                setForm({ ...form, failureCategory: e.target.value as MaintenanceFormValues['failureCategory'] })
              }
            >
              <option value="INSTRUMENT">Instrument</option>
              <option value="ELECTRICAL">Electrical</option>
              <option value="MECHANICAL">Mechanical</option>
              <option value="COMMUNICATION">Communication</option>
              <option value="CONFIGURATION">Configuration</option>
              <option value="CALIBRATION">Calibration</option>
              <option value="PROCESS">Process</option>
            </Select>
          </div>

          <div>
            <Label htmlFor="priority">Priority</Label>
            <Select
              id="priority"
              value={form.priority}
              onChange={(e) => setForm({ ...form, priority: e.target.value as MaintenanceFormValues['priority'] })}
            >
              <option value="HIGH">High</option>
              <option value="MEDIUM">Medium</option>
              <option value="LOW">Low</option>
            </Select>
          </div>

          <div>
            <Label htmlFor="technicianId">Technician / PIC</Label>
            <Select
              id="technicianId"
              value={form.technicianId}
              onChange={(e) => setForm({ ...form, technicianId: e.target.value })}
              required
            >
              <option value="" disabled>
                Pilih technician...
              </option>
              {technicians?.map((tech) => (
                <option key={tech.id} value={tech.id}>
                  {tech.fullName}
                </option>
              ))}
            </Select>
          </div>

          <div className="col-span-2">
            <Label>Technician Tambahan (opsional)</Label>
            <div className="mt-1 flex flex-wrap gap-x-4 gap-y-2 rounded-md border border-border p-3">
              {technicians && technicians.length > 0 ? (
                technicians
                  .filter((tech) => tech.id !== form.technicianId)
                  .map((tech) => (
                    <label key={tech.id} className="flex items-center gap-2 text-sm text-text">
                      <input
                        type="checkbox"
                        className="h-4 w-4 rounded border-border"
                        checked={form.additionalTechnicianIds.includes(tech.id)}
                        onChange={(e) => toggleAdditionalTechnician(tech.id, e.target.checked)}
                      />
                      {tech.fullName}
                    </label>
                  ))
              ) : (
                <p className="text-sm text-text-muted">Tidak ada technician lain.</p>
              )}
            </div>
          </div>

          <div className="col-span-2">
            <Label htmlFor="problemDescription">Problem Description</Label>
            <Textarea
              id="problemDescription"
              value={form.problemDescription}
              onChange={(e) => setForm({ ...form, problemDescription: e.target.value })}
              maxLength={1000}
              required
            />
          </div>

          <div className="col-span-2">
            <Label htmlFor="rootCause">Root Cause</Label>
            <Textarea
              id="rootCause"
              value={form.rootCause}
              onChange={(e) => setForm({ ...form, rootCause: e.target.value })}
              maxLength={1000}
            />
          </div>

          <div className="col-span-2">
            <Label htmlFor="actionTaken">Action Taken</Label>
            <Textarea
              id="actionTaken"
              value={form.actionTaken}
              onChange={(e) => setForm({ ...form, actionTaken: e.target.value })}
              maxLength={1000}
            />
          </div>

          <div>
            <Label htmlFor="downtimeHours">Downtime Hours</Label>
            <Input
              id="downtimeHours"
              type="number"
              min={0}
              max={9999}
              step="0.1"
              value={form.downtimeHours}
              onChange={(e) => setForm({ ...form, downtimeHours: e.target.value })}
            />
          </div>

          <div>
            <Label htmlFor="status">Maintenance Status</Label>
            <Select
              id="status"
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value as MaintenanceFormValues['status'] })}
            >
              <option value="OPEN">Open</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="WAITING_MATERIAL">Waiting Material</option>
              <option value="COMPLETED">Completed</option>
              <option value="CANCELLED">Cancelled</option>
            </Select>
            {isEdit && form.status === 'CANCELLED' && maintenance?.needsSparePart && (
              <p className="mt-1 text-xs text-warning">
                Mengubah status ke Cancelled akan mengembalikan stock material yang sudah dipakai.
              </p>
            )}
          </div>

          <div>
            <Label htmlFor="completionDate">Completion Date</Label>
            <Input
              id="completionDate"
              type="date"
              value={form.completionDate}
              onChange={(e) => setForm({ ...form, completionDate: e.target.value })}
            />
          </div>

          <div className="col-span-2 rounded-md border border-border p-3">
            <label className="flex items-center gap-2 text-sm font-medium text-text">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-border"
                checked={form.needsSparePart}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    needsSparePart: e.target.checked,
                    materials: e.target.checked && f.materials.length === 0 ? [{ sparePartId: '', quantity: 1, remarks: '' }] : f.materials,
                  }))
                }
              />
              Butuh Spare Part / Material?
            </label>

            {form.needsSparePart && (
              <div className="mt-3 space-y-2">
                {form.materials.map((material, index) => (
                  <div key={index} className="flex items-start gap-2">
                    <div className="flex-1">
                      <SearchableSelect
                        value={material.sparePartId}
                        onChange={(sparePartId) => updateMaterialRow(index, { sparePartId })}
                        options={(sparePartOptions ?? []).map((sp) => ({
                          value: sp.id,
                          label: sp.kimap,
                          sublabel: `${sp.name} (stock: ${sp.stock} ${sp.unit})`,
                        }))}
                        placeholder="Pilih spare part..."
                        searchPlaceholder="Cari KIMAP / nama material..."
                        emptyText="Tidak ada spare part yang cocok."
                      />
                    </div>
                    <Input
                      type="number"
                      min={0.01}
                      step="0.01"
                      className="w-24"
                      placeholder="Qty"
                      value={material.quantity}
                      onChange={(e) => updateMaterialRow(index, { quantity: e.target.value })}
                    />
                    <Button type="button" variant="ghost" size="icon" onClick={() => removeMaterialRow(index)} title="Hapus baris">
                      <Trash2 className="h-4 w-4 text-danger" />
                    </Button>
                  </div>
                ))}
                <Button type="button" variant="outline" size="sm" onClick={addMaterialRow}>
                  <Plus className="h-4 w-4" />
                  Tambah Material
                </Button>
              </div>
            )}
          </div>

          <div className="col-span-2 rounded-md border border-border p-3">
            <p className="mb-3 text-sm font-medium text-text">Informasi Notifikasi & Work Order (ERP)</p>
            <p className="mb-3 text-xs text-text-muted">
              Diisi manual sebagai referensi setelah Notifikasi/WO diterbitkan di sistem ERP (mis. SAP PM). Opsional.
            </p>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label htmlFor="notificationNumber">No. Notifikasi</Label>
                <Input
                  id="notificationNumber"
                  value={form.notificationNumber ?? ''}
                  onChange={(e) => setForm({ ...form, notificationNumber: e.target.value })}
                  maxLength={50}
                />
              </div>
              <div>
                <Label htmlFor="notificationDate">Tanggal Notifikasi</Label>
                <Input
                  id="notificationDate"
                  type="date"
                  value={form.notificationDate ?? ''}
                  onChange={(e) => setForm({ ...form, notificationDate: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="notificationStatus">Status Notifikasi</Label>
                <Input
                  id="notificationStatus"
                  value={form.notificationStatus ?? ''}
                  onChange={(e) => setForm({ ...form, notificationStatus: e.target.value })}
                  maxLength={50}
                />
              </div>
              <div>
                <Label htmlFor="workOrderNumber">No. Work Order</Label>
                <Input
                  id="workOrderNumber"
                  value={form.workOrderNumber ?? ''}
                  onChange={(e) => setForm({ ...form, workOrderNumber: e.target.value })}
                  maxLength={50}
                />
              </div>
              <div>
                <Label htmlFor="workOrderDate">Tanggal WO</Label>
                <Input
                  id="workOrderDate"
                  type="date"
                  value={form.workOrderDate ?? ''}
                  onChange={(e) => setForm({ ...form, workOrderDate: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="workOrderStatus">Status WO</Label>
                <Input
                  id="workOrderStatus"
                  value={form.workOrderStatus ?? ''}
                  onChange={(e) => setForm({ ...form, workOrderStatus: e.target.value })}
                  maxLength={50}
                />
              </div>
            </div>
          </div>

          <div className="col-span-2">
            <Label htmlFor="remarks">Remarks</Label>
            <Textarea
              id="remarks"
              value={form.remarks}
              onChange={(e) => setForm({ ...form, remarks: e.target.value })}
              maxLength={500}
            />
          </div>

          <DialogFooter className="col-span-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Batal
            </Button>
            <Button type="submit" disabled={isSaving}>
              {isSaving ? 'Menyimpan...' : 'Simpan'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
