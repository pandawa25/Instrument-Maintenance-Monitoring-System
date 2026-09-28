import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useCreateMaintenance, useUpdateMaintenance } from '../hooks/use-maintenance';
import { useEquipmentLookup, useTechniciansLookup } from '../hooks/use-maintenance-lookups';
import type { Maintenance, MaintenanceFormValues } from '../types/maintenance.types';

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
            }
          : EMPTY_FORM,
      );
      setError(null);
    }
  }, [open, maintenance]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      const payload: MaintenanceFormValues = {
        ...form,
        downtimeHours: form.downtimeHours === '' ? undefined : Number(form.downtimeHours),
        completionDate: form.completionDate || undefined,
        rootCause: form.rootCause || undefined,
        actionTaken: form.actionTaken || undefined,
        remarks: form.remarks || undefined,
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
            <Select
              id="equipmentId"
              value={form.equipmentId}
              onChange={(e) => setForm({ ...form, equipmentId: e.target.value })}
              required
            >
              <option value="" disabled>
                Pilih equipment...
              </option>
              {equipmentOptions?.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.tagNumber} — {item.service}
                </option>
              ))}
            </Select>
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
