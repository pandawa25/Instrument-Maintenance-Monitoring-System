import { useEffect, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
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

const EMPTY_FORM: MaintenanceFormValues = {
  maintenanceDate: '',
  equipmentId: '',
  failureCategory: 'INSTRUMENT',
  problemDescription: '',
  rootCause: '',
  actionTaken: '',
  downtimeHours: '',
  technicianId: '',
  status: 'OPEN',
  completionDate: '',
  remarks: '',
  needsSparePart: false,
  materials: [],
};

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  maintenance?: Maintenance | null; // null/undefined = mode create
}

export function MaintenanceFormDialog({ open, onOpenChange, maintenance }: Props) {
  const [form, setForm] = useState<MaintenanceFormValues>(EMPTY_FORM);
  const [error, setError] = useState<string | null>(null);
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
              maintenanceDate: maintenance.maintenanceDate.slice(0, 10),
              equipmentId: maintenance.equipment.id,
              failureCategory: maintenance.failureCategory,
              problemDescription: maintenance.problemDescription,
              rootCause: maintenance.rootCause ?? '',
              actionTaken: maintenance.actionTaken ?? '',
              downtimeHours: maintenance.downtimeHours ?? '',
              technicianId: maintenance.technician.id,
              status: maintenance.status,
              completionDate: maintenance.completionDate?.slice(0, 10) ?? '',
              remarks: maintenance.remarks ?? '',
              needsSparePart: maintenance.needsSparePart,
              materials: maintenance.materials.map((m) => ({
                sparePartId: m.sparePart.id,
                quantity: m.quantity,
                remarks: m.remarks ?? undefined,
              })),
            }
          : EMPTY_FORM,
      );
      setError(null);
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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (form.needsSparePart && form.materials.some((m) => !m.sparePartId)) {
      setError('Pilih spare part untuk setiap baris material, atau hapus baris yang kosong');
      return;
    }

    try {
      const payload: MaintenanceFormValues = {
        ...form,
        downtimeHours: form.downtimeHours === '' ? undefined : Number(form.downtimeHours),
        completionDate: form.completionDate || undefined,
        rootCause: form.rootCause || undefined,
        actionTaken: form.actionTaken || undefined,
        remarks: form.remarks || undefined,
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
      } else {
        await createMutation.mutateAsync(payload);
      }
      onOpenChange(false);
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'Gagal menyimpan data maintenance');
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Corrective Maintenance' : 'Tambah Corrective Maintenance'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-4">
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
            <Label htmlFor="technicianId">Technician</Label>
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
              <option value="COMPLETED">Completed</option>
            </Select>
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

          <div className="col-span-2">
            <Label htmlFor="remarks">Remarks</Label>
            <Textarea
              id="remarks"
              value={form.remarks}
              onChange={(e) => setForm({ ...form, remarks: e.target.value })}
              maxLength={500}
            />
          </div>

          {error && <p className="col-span-2 text-sm text-danger">{error}</p>}

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
