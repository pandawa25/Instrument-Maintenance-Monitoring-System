import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { useCreateEquipment, useUpdateEquipment } from '../hooks/use-equipment';
import { useAreasLookup, useInstrumentNames } from '../hooks/use-equipment-lookups';
import { isValveInstrumentCode, type Equipment, type EquipmentFormValues, type FailAction } from '../types/equipment.types';

const EMPTY_FORM: EquipmentFormValues = {
  tagNumber: '',
  service: '',
  description: '',
  areaId: '',
  instrumentNameId: '',
  type: '',
  manufacturer: '',
  model: '',
  serialNumber: '',
  installationDate: '',
  lrv: '',
  urv: '',
  unit: '',
  size: '',
  rating: '',
  failAction: '',
  status: 'ACTIVE',
  criticality: 'MEDIUM',
  remarks: '',
};

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  equipment?: Equipment | null; // null/undefined = mode create
}

/**
 * Tag Number disimpan penuh sebagai "{Area Code}-{Tag No}" (mis. "PU-01-PT-1001"),
 * tapi di form user cukup mengetik bagian belakangnya — prefix kode area otomatis
 * ditempelkan begitu Area dipilih. `tagSuffix` adalah state UI saja, tidak dikirim
 * ke API; nilai gabungan dihitung saat submit.
 */
function stripAreaPrefix(tagNumber: string, areaCode?: string): string {
  if (areaCode && tagNumber.startsWith(`${areaCode}-`)) {
    return tagNumber.slice(areaCode.length + 1);
  }
  return tagNumber;
}

export function EquipmentFormDialog({ open, onOpenChange, equipment }: Props) {
  const [form, setForm] = useState<EquipmentFormValues>(EMPTY_FORM);
  const [tagSuffix, setTagSuffix] = useState('');
  const createMutation = useCreateEquipment();
  const updateMutation = useUpdateEquipment();
  const { data: areas } = useAreasLookup();
  const { data: instrumentNames } = useInstrumentNames();
  const isEdit = Boolean(equipment);
  const isSaving = createMutation.isPending || updateMutation.isPending;

  const selectedArea = areas?.find((area) => area.id === form.areaId);
  const selectedInstrumentName = instrumentNames?.find((item) => item.id === form.instrumentNameId);
  const isValve = isValveInstrumentCode(selectedInstrumentName?.code);

  useEffect(() => {
    if (open) {
      if (equipment) {
        setForm({
          tagNumber: equipment.tagNumber,
          service: equipment.service,
          description: equipment.description ?? '',
          areaId: equipment.area.id,
          instrumentNameId: equipment.instrumentName.id,
          type: equipment.type ?? '',
          manufacturer: equipment.manufacturer ?? '',
          model: equipment.model ?? '',
          serialNumber: equipment.serialNumber ?? '',
          installationDate: equipment.installationDate?.slice(0, 10) ?? '',
          lrv: equipment.lrv ?? '',
          urv: equipment.urv ?? '',
          unit: equipment.unit ?? '',
          size: equipment.size ?? '',
          rating: equipment.rating ?? '',
          failAction: equipment.failAction ?? '',
          status: equipment.status,
          criticality: equipment.criticality,
          remarks: equipment.remarks ?? '',
        });
        setTagSuffix(stripAreaPrefix(equipment.tagNumber, equipment.area.areaCode));
      } else {
        setForm(EMPTY_FORM);
        setTagSuffix('');
      }
    }
  }, [open, equipment]);

  function handleAreaChange(areaId: string) {
    setForm({ ...form, areaId });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!selectedArea) {
      toast.error('Pilih area terlebih dahulu');
      return;
    }

    const composedTagNumber = `${selectedArea.areaCode}-${tagSuffix}`.trim();

    try {
      // Equipment valve (CV/SV/KV/UV) pakai Size/Rating/Fail Action, equipment lain pakai
      // LRV/URV/Unit — keduanya saling eksklusif, jadi field yang tidak relevan dikosongkan
      // saat submit supaya tidak ada data basi tersisa kalau instrument type pernah diganti.
      const payload: EquipmentFormValues = {
        ...form,
        tagNumber: composedTagNumber,
        installationDate: form.installationDate || undefined,
        lrv: isValve || form.lrv === '' || form.lrv === undefined ? undefined : Number(form.lrv),
        urv: isValve || form.urv === '' || form.urv === undefined ? undefined : Number(form.urv),
        unit: isValve ? undefined : form.unit || undefined,
        size: isValve ? form.size || undefined : undefined,
        rating: isValve ? form.rating || undefined : undefined,
        failAction: isValve && form.failAction ? form.failAction : undefined,
      };
      if (isEdit && equipment) {
        await updateMutation.mutateAsync({ id: equipment.id, payload });
        toast.success('Equipment berhasil diperbarui');
      } else {
        await createMutation.mutateAsync(payload);
        toast.success('Equipment berhasil ditambahkan');
      }
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'Gagal menyimpan equipment');
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Equipment' : 'Tambah Equipment'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="areaId">Area</Label>
            <Select id="areaId" value={form.areaId} onChange={(e) => handleAreaChange(e.target.value)} required>
              <option value="" disabled>
                Pilih area...
              </option>
              {areas?.map((area) => (
                <option key={area.id} value={area.id}>
                  {area.areaCode} — {area.areaName}
                </option>
              ))}
            </Select>
          </div>

          <div>
            <Label htmlFor="tagSuffix">Tag Number</Label>
            <div className="flex h-9 items-stretch overflow-hidden rounded-md border border-border bg-surface-2 focus-within:ring-2 focus-within:ring-primary/40">
              <span className="flex items-center whitespace-nowrap bg-surface-2 px-2 text-sm text-text-muted">
                {selectedArea ? `${selectedArea.areaCode}-` : 'Area-'}
              </span>
              <input
                id="tagSuffix"
                value={tagSuffix}
                onChange={(e) => setTagSuffix(e.target.value)}
                placeholder="PT-1001"
                maxLength={40}
                required
                className="w-full border-0 bg-surface px-2 py-1 text-sm text-text placeholder:text-text-muted focus-visible:outline-none"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="service">Service</Label>
            <Input
              id="service"
              value={form.service}
              onChange={(e) => setForm({ ...form, service: e.target.value })}
              maxLength={150}
              required
            />
          </div>

          <div>
            <Label htmlFor="instrumentNameId">Instrument Name</Label>
            <Select
              id="instrumentNameId"
              value={form.instrumentNameId}
              onChange={(e) => setForm({ ...form, instrumentNameId: e.target.value })}
              required
            >
              <option value="" disabled>
                Pilih instrument name...
              </option>
              {instrumentNames?.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </Select>
          </div>

          <div className="col-span-2">
            <Label htmlFor="description">Description</Label>
            <Input
              id="description"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              maxLength={255}
            />
          </div>

          <div>
            <Label htmlFor="type">Type</Label>
            <Input
              id="type"
              value={form.type}
              onChange={(e) => setForm({ ...form, type: e.target.value })}
              placeholder="mis. Smart, Conventional"
              maxLength={100}
            />
          </div>

          <div>
            <Label htmlFor="manufacturer">Manufacturer</Label>
            <Input
              id="manufacturer"
              value={form.manufacturer}
              onChange={(e) => setForm({ ...form, manufacturer: e.target.value })}
              maxLength={100}
            />
          </div>

          <div>
            <Label htmlFor="model">Model</Label>
            <Input
              id="model"
              value={form.model}
              onChange={(e) => setForm({ ...form, model: e.target.value })}
              maxLength={100}
            />
          </div>

          <div>
            <Label htmlFor="serialNumber">Serial Number</Label>
            <Input
              id="serialNumber"
              value={form.serialNumber}
              onChange={(e) => setForm({ ...form, serialNumber: e.target.value })}
              maxLength={100}
            />
          </div>

          <div>
            <Label htmlFor="installationDate">Installation Date</Label>
            <Input
              id="installationDate"
              type="date"
              value={form.installationDate}
              onChange={(e) => setForm({ ...form, installationDate: e.target.value })}
            />
          </div>

          {isValve ? (
            <>
              <div>
                <Label htmlFor="size">Size</Label>
                <Input
                  id="size"
                  value={form.size}
                  onChange={(e) => setForm({ ...form, size: e.target.value })}
                  placeholder='mis. 2", 4"'
                  maxLength={50}
                />
              </div>

              <div>
                <Label htmlFor="rating">Rating</Label>
                <Input
                  id="rating"
                  value={form.rating}
                  onChange={(e) => setForm({ ...form, rating: e.target.value })}
                  placeholder="mis. ANSI 600"
                  maxLength={50}
                />
              </div>

              <div>
                <Label htmlFor="failAction">Fail Action</Label>
                <Select
                  id="failAction"
                  value={form.failAction}
                  onChange={(e) => setForm({ ...form, failAction: e.target.value as FailAction })}
                >
                  <option value="">Pilih fail action...</option>
                  <option value="CLOSE">Close</option>
                  <option value="OPEN">Open</option>
                  <option value="LAST_POSITION">Last Position</option>
                </Select>
              </div>
            </>
          ) : (
            <>
              <div>
                <Label htmlFor="lrv">LRV (Lower Range Value)</Label>
                <Input
                  id="lrv"
                  type="number"
                  step="any"
                  value={form.lrv}
                  onChange={(e) => setForm({ ...form, lrv: e.target.value })}
                  placeholder="0"
                />
              </div>

              <div>
                <Label htmlFor="urv">URV (Upper Range Value)</Label>
                <Input
                  id="urv"
                  type="number"
                  step="any"
                  value={form.urv}
                  onChange={(e) => setForm({ ...form, urv: e.target.value })}
                  placeholder="100"
                />
              </div>

              <div>
                <Label htmlFor="unit">Unit</Label>
                <Input
                  id="unit"
                  value={form.unit}
                  onChange={(e) => setForm({ ...form, unit: e.target.value })}
                  placeholder="mis. barg, °C, m3/h"
                  maxLength={20}
                />
              </div>
            </>
          )}

          <div>
            <Label htmlFor="status">Status</Label>
            <Select
              id="status"
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value as EquipmentFormValues['status'] })}
            >
              <option value="ACTIVE">Active</option>
              <option value="STANDBY">Standby</option>
              <option value="OUT_OF_SERVICE">Out Of Service</option>
            </Select>
          </div>

          <div>
            <Label htmlFor="criticality">Criticality</Label>
            <Select
              id="criticality"
              value={form.criticality}
              onChange={(e) =>
                setForm({ ...form, criticality: e.target.value as EquipmentFormValues['criticality'] })
              }
            >
              <option value="HIGH">High</option>
              <option value="MEDIUM">Medium</option>
              <option value="LOW">Low</option>
            </Select>
          </div>

          <div className="col-span-2">
            <Label htmlFor="remarks">Remarks</Label>
            <Input
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
