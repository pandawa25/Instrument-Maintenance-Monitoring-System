import { useState } from 'react';
import { CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { useInstrumentNames } from '../hooks/use-equipment-lookups';
import { usePreviewBulkEdit, useCommitBulkEdit } from '../hooks/use-equipment';
import type { BulkEditFieldKey, BulkEditFieldsValues, BulkEditPreviewResult } from '../types/equipment.types';
import { getErrorMessage } from '@/lib/axios';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  equipmentIds: string[];
  onDone: () => void;
}

type Step = 'fields' | 'preview' | 'done';
type FieldKind = 'text' | 'number' | 'date' | 'select-status' | 'select-criticality' | 'select-fail-action' | 'select-instrument-name';

const FIELD_CONFIGS: { key: BulkEditFieldKey; label: string; kind: FieldKind }[] = [
  { key: 'status', label: 'Status', kind: 'select-status' },
  { key: 'criticality', label: 'Criticality', kind: 'select-criticality' },
  { key: 'instrumentNameId', label: 'Instrument Name', kind: 'select-instrument-name' },
  { key: 'type', label: 'Type', kind: 'text' },
  { key: 'manufacturer', label: 'Manufacturer', kind: 'text' },
  { key: 'model', label: 'Model', kind: 'text' },
  { key: 'service', label: 'Service', kind: 'text' },
  { key: 'description', label: 'Description', kind: 'text' },
  { key: 'installationDate', label: 'Installation Date', kind: 'date' },
  { key: 'unit', label: 'Unit', kind: 'text' },
  { key: 'lrv', label: 'LRV', kind: 'number' },
  { key: 'urv', label: 'URV', kind: 'number' },
  { key: 'size', label: 'Size', kind: 'text' },
  { key: 'rating', label: 'Rating', kind: 'text' },
  { key: 'failAction', label: 'Fail Action', kind: 'select-fail-action' },
  { key: 'remarks', label: 'Remarks', kind: 'text' },
];

/**
 * Edit Massal — ubah field yang SAMA untuk banyak equipment sekaligus (mis. set Status =
 * Out Of Service untuk 20 equipment terpilih). Field yang boleh diubah SENGAJA tidak
 * termasuk Tag Number/Area/Serial Number — lihat BulkEditFieldsDto di backend & diskusi
 * desain di roadmap.md. User centang field yang mau diubah, isi nilainya, lalu preview
 * before→after sebelum benar-benar commit.
 */
export function EquipmentBulkEditDialog({ open, onOpenChange, equipmentIds, onDone }: Props) {
  const [step, setStep] = useState<Step>('fields');
  const [enabled, setEnabled] = useState<Partial<Record<BulkEditFieldKey, boolean>>>({});
  const [values, setValues] = useState<Record<string, string>>({});
  const [preview, setPreview] = useState<BulkEditPreviewResult | null>(null);

  const { data: instrumentNames } = useInstrumentNames();
  const previewMutation = usePreviewBulkEdit();
  const commitMutation = useCommitBulkEdit();

  function reset() {
    setStep('fields');
    setEnabled({});
    setValues({});
    setPreview(null);
  }

  function handleClose(nextOpen: boolean) {
    if (!nextOpen) reset();
    onOpenChange(nextOpen);
  }

  function toggleField(key: BulkEditFieldKey) {
    setEnabled((cur) => ({ ...cur, [key]: !cur[key] }));
  }

  function buildPayload(): BulkEditFieldsValues {
    const payload: BulkEditFieldsValues = {};
    for (const field of FIELD_CONFIGS) {
      if (!enabled[field.key]) continue;
      const raw = values[field.key] ?? '';
      if (field.kind === 'number') {
        (payload as Record<string, unknown>)[field.key] = raw === '' ? undefined : Number(raw);
      } else {
        (payload as Record<string, unknown>)[field.key] = raw === '' ? undefined : raw;
      }
    }
    return payload;
  }

  async function handlePreview() {
    const selectedCount = Object.values(enabled).filter(Boolean).length;
    if (selectedCount === 0) {
      toast.error('Pilih minimal satu field yang ingin diubah');
      return;
    }
    try {
      const result = await previewMutation.mutateAsync({ ids: equipmentIds, fields: buildPayload() });
      setPreview(result);
      setStep('preview');
    } catch (err: any) {
      toast.error(getErrorMessage(err, 'Gagal memuat preview'));
    }
  }

  async function handleCommit() {
    try {
      const result = await commitMutation.mutateAsync({ ids: equipmentIds, fields: buildPayload() });
      toast.success(`${result.updatedCount} equipment berhasil diperbarui`);
      setStep('done');
    } catch (err: any) {
      toast.error(getErrorMessage(err, 'Gagal menyimpan perubahan'));
    }
  }

  function handleFinish() {
    handleClose(false);
    onDone();
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Edit Massal — {equipmentIds.length} Equipment Terpilih</DialogTitle>
        </DialogHeader>

        {step === 'fields' && (
          <div className="max-h-[60vh] space-y-1 overflow-y-auto">
            <p className="mb-2 text-sm text-text-muted">
              Centang field yang ingin diubah, lalu isi nilai barunya. Field yang tidak dicentang tidak akan
              disentuh sama sekali.
            </p>
            {FIELD_CONFIGS.map((field) => (
              <div key={field.key} className="flex items-center gap-3 border-b border-border py-2 last:border-0">
                <input
                  type="checkbox"
                  className="h-4 w-4 shrink-0 rounded border-border"
                  checked={Boolean(enabled[field.key])}
                  onChange={() => toggleField(field.key)}
                  id={`bulk-edit-${field.key}`}
                />
                <label htmlFor={`bulk-edit-${field.key}`} className="w-36 shrink-0 text-sm text-text">
                  {field.label}
                </label>
                <div className="flex-1">
                  {field.kind === 'select-status' && (
                    <Select
                      disabled={!enabled[field.key]}
                      value={values[field.key] ?? ''}
                      onChange={(e) => setValues((v) => ({ ...v, [field.key]: e.target.value }))}
                    >
                      <option value="">Pilih status...</option>
                      <option value="ACTIVE">Active</option>
                      <option value="STANDBY">Standby</option>
                      <option value="OUT_OF_SERVICE">Out Of Service</option>
                    </Select>
                  )}
                  {field.kind === 'select-criticality' && (
                    <Select
                      disabled={!enabled[field.key]}
                      value={values[field.key] ?? ''}
                      onChange={(e) => setValues((v) => ({ ...v, [field.key]: e.target.value }))}
                    >
                      <option value="">Pilih criticality...</option>
                      <option value="HIGH">High</option>
                      <option value="MEDIUM">Medium</option>
                      <option value="LOW">Low</option>
                    </Select>
                  )}
                  {field.kind === 'select-fail-action' && (
                    <Select
                      disabled={!enabled[field.key]}
                      value={values[field.key] ?? ''}
                      onChange={(e) => setValues((v) => ({ ...v, [field.key]: e.target.value }))}
                    >
                      <option value="">Pilih fail action...</option>
                      <option value="CLOSE">Close</option>
                      <option value="OPEN">Open</option>
                      <option value="LAST_POSITION">Last Position</option>
                    </Select>
                  )}
                  {field.kind === 'select-instrument-name' && (
                    <Select
                      disabled={!enabled[field.key]}
                      value={values[field.key] ?? ''}
                      onChange={(e) => setValues((v) => ({ ...v, [field.key]: e.target.value }))}
                    >
                      <option value="">Pilih instrument name...</option>
                      {instrumentNames?.map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.name}
                        </option>
                      ))}
                    </Select>
                  )}
                  {(field.kind === 'text' || field.kind === 'number' || field.kind === 'date') && (
                    <Input
                      type={field.kind === 'number' ? 'number' : field.kind === 'date' ? 'date' : 'text'}
                      step={field.kind === 'number' ? 'any' : undefined}
                      disabled={!enabled[field.key]}
                      value={values[field.key] ?? ''}
                      onChange={(e) => setValues((v) => ({ ...v, [field.key]: e.target.value }))}
                    />
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {step === 'preview' && preview && (
          <div className="space-y-3">
            <div className="grid grid-cols-3 gap-2 text-center text-sm">
              <div className="rounded-lg border border-border bg-surface-2/60 p-2">
                <div className="text-lg font-semibold text-text">{preview.totalSelected}</div>
                <div className="text-xs text-text-muted">Dipilih</div>
              </div>
              <div className="rounded-lg border border-border bg-surface-2/60 p-2">
                <div className="text-lg font-semibold text-warning">{preview.changedCount}</div>
                <div className="text-xs text-text-muted">Akan Berubah</div>
              </div>
              <div className="rounded-lg border border-border bg-surface-2/60 p-2">
                <div className="text-lg font-semibold text-text-muted">{preview.unchangedCount}</div>
                <div className="text-xs text-text-muted">Tidak Berubah</div>
              </div>
            </div>

            {preview.changedCount === 0 ? (
              <p className="text-sm text-text-muted">
                Semua equipment terpilih sudah punya nilai yang sama persis — tidak ada yang bisa di-commit.
              </p>
            ) : (
              <div className="max-h-72 overflow-y-auto rounded-lg border border-border">
                <ul className="divide-y divide-border text-sm">
                  {preview.rows
                    .filter((r) => r.changes.length > 0)
                    .map((row) => (
                      <li key={row.equipmentId} className="p-2">
                        <p className="font-mono text-xs font-medium text-text">{row.tagNumber}</p>
                        <ul className="mt-1 space-y-0.5 text-xs text-text-muted">
                          {row.changes.map((c) => (
                            <li key={c.field}>
                              {c.label}: <span className="line-through">{String(c.before ?? '—')}</span>{' '}
                              <span className="text-text">→ {String(c.after ?? '—')}</span>
                            </li>
                          ))}
                        </ul>
                      </li>
                    ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {step === 'done' && (
          <div className="space-y-2 rounded-lg border border-success/30 bg-success/5 p-4 text-sm">
            <p className="flex items-center gap-2 font-medium text-text">
              <CheckCircle2 className="h-4 w-4 text-success" />
              Berhasil — {commitMutation.data?.updatedCount ?? 0} equipment diperbarui.
            </p>
          </div>
        )}

        <DialogFooter>
          {step === 'fields' && (
            <>
              <Button type="button" variant="outline" onClick={() => handleClose(false)}>
                Batal
              </Button>
              <Button type="button" onClick={handlePreview} disabled={previewMutation.isPending}>
                {previewMutation.isPending ? 'Memuat...' : 'Preview Perubahan'}
              </Button>
            </>
          )}

          {step === 'preview' && (
            <>
              <Button type="button" variant="outline" onClick={() => setStep('fields')}>
                Kembali
              </Button>
              <Button
                type="button"
                onClick={handleCommit}
                disabled={!preview || preview.changedCount === 0 || commitMutation.isPending}
              >
                {commitMutation.isPending ? 'Menyimpan...' : `Terapkan ke ${preview?.changedCount ?? 0} Equipment`}
              </Button>
            </>
          )}

          {step === 'done' && <Button onClick={handleFinish}>Selesai</Button>}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
