import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { useCreateInstrument, useUpdateInstrument } from '../hooks/use-instruments';
import { useAreasLookup, useInstrumentTypes } from '../hooks/use-instrument-lookups';
import type { Instrument, InstrumentFormValues } from '../types/instrument.types';

const EMPTY_FORM: InstrumentFormValues = {
  tagNumber: '',
  instrumentName: '',
  description: '',
  areaId: '',
  instrumentTypeId: '',
  manufacturer: '',
  model: '',
  serialNumber: '',
  installationDate: '',
  status: 'ACTIVE',
  criticality: 'MEDIUM',
  remarks: '',
};

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  instrument?: Instrument | null; // null/undefined = mode create
}

export function InstrumentFormDialog({ open, onOpenChange, instrument }: Props) {
  const [form, setForm] = useState<InstrumentFormValues>(EMPTY_FORM);
  const [error, setError] = useState<string | null>(null);
  const createMutation = useCreateInstrument();
  const updateMutation = useUpdateInstrument();
  const { data: areas } = useAreasLookup();
  const { data: instrumentTypes } = useInstrumentTypes();
  const isEdit = Boolean(instrument);
  const isSaving = createMutation.isPending || updateMutation.isPending;

  useEffect(() => {
    if (open) {
      setForm(
        instrument
          ? {
              tagNumber: instrument.tagNumber,
              instrumentName: instrument.instrumentName,
              description: instrument.description ?? '',
              areaId: instrument.area.id,
              instrumentTypeId: instrument.instrumentType.id,
              manufacturer: instrument.manufacturer ?? '',
              model: instrument.model ?? '',
              serialNumber: instrument.serialNumber ?? '',
              installationDate: instrument.installationDate?.slice(0, 10) ?? '',
              status: instrument.status,
              criticality: instrument.criticality,
              remarks: instrument.remarks ?? '',
            }
          : EMPTY_FORM,
      );
      setError(null);
    }
  }, [open, instrument]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      const payload: InstrumentFormValues = {
        ...form,
        installationDate: form.installationDate || undefined,
      };
      if (isEdit && instrument) {
        await updateMutation.mutateAsync({ id: instrument.id, payload });
      } else {
        await createMutation.mutateAsync(payload);
      }
      onOpenChange(false);
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'Gagal menyimpan instrument');
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Instrument' : 'Tambah Instrument'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="tagNumber">Tag Number</Label>
            <Input
              id="tagNumber"
              value={form.tagNumber}
              onChange={(e) => setForm({ ...form, tagNumber: e.target.value })}
              placeholder="PT-1001"
              maxLength={50}
              required
            />
          </div>

          <div>
            <Label htmlFor="instrumentName">Instrument Name</Label>
            <Input
              id="instrumentName"
              value={form.instrumentName}
              onChange={(e) => setForm({ ...form, instrumentName: e.target.value })}
              maxLength={150}
              required
            />
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
            <Label htmlFor="areaId">Area</Label>
            <Select
              id="areaId"
              value={form.areaId}
              onChange={(e) => setForm({ ...form, areaId: e.target.value })}
              required
            >
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
            <Label htmlFor="instrumentTypeId">Instrument Type</Label>
            <Select
              id="instrumentTypeId"
              value={form.instrumentTypeId}
              onChange={(e) => setForm({ ...form, instrumentTypeId: e.target.value })}
              required
            >
              <option value="" disabled>
                Pilih tipe...
              </option>
              {instrumentTypes?.map((type) => (
                <option key={type.id} value={type.id}>
                  {type.typeName}
                </option>
              ))}
            </Select>
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

          <div>
            <Label htmlFor="status">Status</Label>
            <Select
              id="status"
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value as InstrumentFormValues['status'] })}
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
                setForm({ ...form, criticality: e.target.value as InstrumentFormValues['criticality'] })
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
