import { useEffect, useMemo, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { useVendorsLookup } from '@/features/vendors/hooks/use-vendors';
import { usePmActivityTypesLookup } from '@/features/pm-activity-types/hooks/use-pm-activity-types';
import { useCreatePmProgram, usePmProgramDetail, useUpdatePmProgram } from '../hooks/use-pm-programs';
import { useEquipmentOptions } from '../hooks/use-equipment-options';
import type { PmProgramFormValues } from '../types/pm-program.types';

const EMPTY_FORM: PmProgramFormValues = {
  name: '',
  frequencyValue: 1,
  frequencyUnit: 'MONTH',
  vendorId: '',
  startDate: '',
  status: 'ACTIVE',
  remarks: '',
  equipmentIds: [],
  checklistItems: [],
};

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  programId?: string | null; // null/undefined = mode create
}

export function PmProgramFormDialog({ open, onOpenChange, programId }: Props) {
  const [form, setForm] = useState<PmProgramFormValues>(EMPTY_FORM);
  const [equipmentSearch, setEquipmentSearch] = useState('');
  const [error, setError] = useState<string | null>(null);

  const isEdit = Boolean(programId);

  const createMutation = useCreatePmProgram();
  const updateMutation = useUpdatePmProgram();
  const { data: vendors } = useVendorsLookup();
  const { data: activityTypes } = usePmActivityTypesLookup();
  const { data: equipmentOptions } = useEquipmentOptions();
  const { data: program, isLoading: isLoadingDetail } = usePmProgramDetail(isEdit ? programId! : undefined);

  const isSaving = createMutation.isPending || updateMutation.isPending;

  useEffect(() => {
    if (open && (!isEdit || program)) {
      setForm(
        program
          ? {
              name: program.name,
              frequencyValue: program.frequencyValue,
              frequencyUnit: program.frequencyUnit,
              vendorId: program.vendor.id,
              startDate: program.startDate.slice(0, 10),
              status: program.status,
              remarks: program.remarks ?? '',
              equipmentIds: program.equipment.map((e) => e.id),
              checklistItems: program.checklistItems.map((c) => ({
                activityTypeId: c.activityType.id,
                description: c.description ?? '',
                sortOrder: c.sortOrder,
              })),
            }
          : EMPTY_FORM,
      );
      setEquipmentSearch('');
      setError(null);
    }
  }, [open, program, isEdit]);

  const filteredEquipment = useMemo(() => {
    if (!equipmentOptions) return [];
    const q = equipmentSearch.trim().toLowerCase();
    if (!q) return equipmentOptions;
    return equipmentOptions.filter(
      (eq) => eq.tagNumber.toLowerCase().includes(q) || eq.service.toLowerCase().includes(q),
    );
  }, [equipmentOptions, equipmentSearch]);

  function toggleEquipment(id: string) {
    setForm((f) => ({
      ...f,
      equipmentIds: f.equipmentIds.includes(id) ? f.equipmentIds.filter((x) => x !== id) : [...f.equipmentIds, id],
    }));
  }

  function addChecklistItem() {
    setForm((f) => ({
      ...f,
      checklistItems: [...f.checklistItems, { activityTypeId: activityTypes?.[0]?.id ?? '', description: '' }],
    }));
  }

  function updateChecklistItem(index: number, patch: Partial<PmProgramFormValues['checklistItems'][number]>) {
    setForm((f) => ({
      ...f,
      checklistItems: f.checklistItems.map((item, i) => (i === index ? { ...item, ...patch } : item)),
    }));
  }

  function removeChecklistItem(index: number) {
    setForm((f) => ({ ...f, checklistItems: f.checklistItems.filter((_, i) => i !== index) }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (form.equipmentIds.length === 0) {
      setError('Pilih minimal 1 equipment yang dicakup program ini');
      return;
    }

    try {
      const payload: PmProgramFormValues = {
        ...form,
        remarks: form.remarks || undefined,
        checklistItems: form.checklistItems
          .filter((item) => item.activityTypeId)
          .map((item, index) => ({ ...item, sortOrder: index })),
      };
      if (isEdit && programId) {
        await updateMutation.mutateAsync({ id: programId, payload });
      } else {
        await createMutation.mutateAsync(payload);
      }
      onOpenChange(false);
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'Gagal menyimpan PM Program');
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit PM Program' : 'Tambah PM Program'}</DialogTitle>
        </DialogHeader>

        {isEdit && isLoadingDetail ? (
          <p className="py-8 text-center text-sm text-text-muted">Memuat data...</p>
        ) : (
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Label htmlFor="name">Judul PM Program</Label>
              <Input
                id="name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="PM ATG 3 Bulanan"
                maxLength={150}
                required
              />
            </div>

            <div>
              <Label htmlFor="frequencyValue">Frekuensi</Label>
              <div className="flex gap-2">
                <Input
                  id="frequencyValue"
                  type="number"
                  min={1}
                  value={form.frequencyValue}
                  onChange={(e) => setForm({ ...form, frequencyValue: Number(e.target.value) })}
                  className="w-20"
                  required
                />
                <Select
                  value={form.frequencyUnit}
                  onChange={(e) => setForm({ ...form, frequencyUnit: e.target.value as PmProgramFormValues['frequencyUnit'] })}
                >
                  <option value="DAY">Hari</option>
                  <option value="WEEK">Minggu</option>
                  <option value="MONTH">Bulan</option>
                  <option value="YEAR">Tahun</option>
                </Select>
              </div>
            </div>

            <div>
              <Label htmlFor="vendorId">Vendor</Label>
              <Select id="vendorId" value={form.vendorId} onChange={(e) => setForm({ ...form, vendorId: e.target.value })} required>
                <option value="" disabled>
                  Pilih vendor...
                </option>
                {vendors?.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.name}
                  </option>
                ))}
              </Select>
            </div>

            <div>
              <Label htmlFor="startDate">Tanggal Mulai (acuan Periode 1)</Label>
              <Input
                id="startDate"
                type="date"
                value={form.startDate}
                onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                required
              />
            </div>

            <div>
              <Label htmlFor="status">Status</Label>
              <Select
                id="status"
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value as PmProgramFormValues['status'] })}
              >
                <option value="ACTIVE">Active</option>
                <option value="INACTIVE">Inactive</option>
              </Select>
            </div>

            <div className="col-span-2">
              <Label htmlFor="remarks">Remarks</Label>
              <Input id="remarks" value={form.remarks} onChange={(e) => setForm({ ...form, remarks: e.target.value })} maxLength={500} />
            </div>
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between">
              <Label>Equipment yang Dicakup ({form.equipmentIds.length} dipilih)</Label>
              <Input
                value={equipmentSearch}
                onChange={(e) => setEquipmentSearch(e.target.value)}
                placeholder="Cari tag number / service..."
                className="w-56"
              />
            </div>
            <div className="max-h-48 overflow-y-auto rounded-md border border-border">
              {filteredEquipment.length === 0 && (
                <p className="p-3 text-sm text-text-muted">Tidak ada equipment yang cocok.</p>
              )}
              {filteredEquipment.map((eq) => (
                <label
                  key={eq.id}
                  className="flex cursor-pointer items-center gap-2 border-b border-border px-3 py-2 text-sm last:border-0 hover:bg-surface-2/60"
                >
                  <input
                    type="checkbox"
                    checked={form.equipmentIds.includes(eq.id)}
                    onChange={() => toggleEquipment(eq.id)}
                    className="h-4 w-4 rounded border-border"
                  />
                  <span className="font-mono text-xs text-text">{eq.tagNumber}</span>
                  <span className="text-text-muted">— {eq.service}</span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between">
              <Label>Checklist Item (opsional)</Label>
              <Button type="button" variant="outline" size="sm" onClick={addChecklistItem}>
                <Plus className="h-3.5 w-3.5" />
                Tambah Item
              </Button>
            </div>
            {form.checklistItems.length === 0 && (
              <p className="rounded-md border border-dashed border-border p-3 text-sm text-text-muted">
                Belum ada checklist item.
              </p>
            )}
            <div className="space-y-2">
              {form.checklistItems.map((item, index) => (
                <div key={index} className="flex items-start gap-2">
                  <Select
                    value={item.activityTypeId}
                    onChange={(e) => updateChecklistItem(index, { activityTypeId: e.target.value })}
                    className="w-48"
                  >
                    <option value="" disabled>
                      Pilih activity...
                    </option>
                    {activityTypes?.map((at) => (
                      <option key={at.id} value={at.id}>
                        {at.name}
                      </option>
                    ))}
                  </Select>
                  <Input
                    value={item.description}
                    onChange={(e) => updateChecklistItem(index, { description: e.target.value })}
                    placeholder="Catatan tambahan (opsional)"
                    maxLength={255}
                  />
                  <Button type="button" variant="ghost" size="icon" onClick={() => removeChecklistItem(index)}>
                    <Trash2 className="h-4 w-4 text-danger" />
                  </Button>
                </div>
              ))}
            </div>
          </div>

          {error && <p className="text-sm text-danger">{error}</p>}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Batal
            </Button>
            <Button type="submit" disabled={isSaving}>
              {isSaving ? 'Menyimpan...' : 'Simpan'}
            </Button>
          </DialogFooter>
        </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
