import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useUpdatePmPeriodExecution } from '../hooks/use-pm-period-executions';
import type { PmChecklistResult, PmExecutionResult, PmExecutionStatus, PmPeriodExecutionItem } from '../types/pm-period.types';
import { getErrorMessage } from '@/lib/axios';

interface ChecklistDraft {
  activityTypeName: string;
  apply: boolean;
  result: PmChecklistResult;
  notes: string;
}

interface FormState {
  applyExecutionDate: boolean;
  executionDate: string;
  applyResult: boolean;
  result: PmExecutionResult;
  applyVendorPersonnel: boolean;
  vendorPersonnel: string;
  applyStatus: boolean;
  status: PmExecutionStatus;
  applyFindings: boolean;
  findings: string;
  applyActionTaken: boolean;
  actionTaken: string;
  checklist: ChecklistDraft[];
}

function buildInitialForm(executions: PmPeriodExecutionItem[]): FormState {
  // Ambil daftar checklist dari eksekusi pertama sebagai acuan label (semua equipment
  // dalam 1 Periode berbagi checklist item yang sama, di-snapshot dari PM Program yang sama).
  const reference = executions[0];
  return {
    applyExecutionDate: false,
    executionDate: '',
    applyResult: false,
    result: 'OK',
    applyVendorPersonnel: false,
    vendorPersonnel: '',
    applyStatus: false,
    status: 'COMPLETED',
    applyFindings: false,
    findings: '',
    applyActionTaken: false,
    actionTaken: '',
    checklist: (reference?.checklistResults ?? [])
      .slice()
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((c) => ({ activityTypeName: c.activityTypeName, apply: false, result: 'OK', notes: '' })),
  };
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  executions: PmPeriodExecutionItem[]; // baris eksekusi yang dipilih untuk diisi massal
}

export function PmBulkExecutionFormDialog({ open, onOpenChange, executions }: Props) {
  const [form, setForm] = useState<FormState>(() => buildInitialForm(executions));
  const updateMutation = useUpdatePmPeriodExecution();

  useEffect(() => {
    if (open) {
      setForm(buildInitialForm(executions));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  function updateChecklistDraft(index: number, patch: Partial<ChecklistDraft>) {
    setForm((f) => ({ ...f, checklist: f.checklist.map((c, i) => (i === index ? { ...c, ...patch } : c)) }));
  }

  const hasAnyFieldSelected =
    form.applyExecutionDate ||
    form.applyResult ||
    form.applyVendorPersonnel ||
    form.applyStatus ||
    form.applyFindings ||
    form.applyActionTaken ||
    form.checklist.some((c) => c.apply);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!hasAnyFieldSelected) {
      toast.error('Centang minimal 1 field yang mau diterapkan ke semua equipment terpilih');
      return;
    }

    try {
      await Promise.all(
        executions.map((exec) => {
          const sortedResults = exec.checklistResults.slice().sort((a, b) => a.sortOrder - b.sortOrder);
          const checklistResults: { id: string; result: PmChecklistResult; notes?: string }[] = [];
          form.checklist.forEach((draft, index) => {
            if (!draft.apply) return;
            const target = sortedResults[index];
            if (!target) return;
            checklistResults.push({ id: target.id, result: draft.result, notes: draft.notes || undefined });
          });

          return updateMutation.mutateAsync({
            id: exec.id,
            payload: {
              executionDate: form.applyExecutionDate ? form.executionDate || undefined : undefined,
              result: form.applyResult ? form.result : undefined,
              vendorPersonnel: form.applyVendorPersonnel ? form.vendorPersonnel || undefined : undefined,
              status: form.applyStatus ? form.status : undefined,
              findings: form.applyFindings ? form.findings || undefined : undefined,
              actionTaken: form.applyActionTaken ? form.actionTaken || undefined : undefined,
              checklistResults: checklistResults.length > 0 ? checklistResults : undefined,
            },
          });
        }),
      );
      toast.success(`Hasil eksekusi berhasil diterapkan ke ${executions.length} equipment`);
      onOpenChange(false);
    } catch (err: any) {
      toast.error(getErrorMessage(err, 'Gagal menyimpan sebagian atau semua eksekusi'));
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Isi Hasil Massal — {executions.length} Equipment</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <p className="text-sm text-text-muted">
            Centang field yang nilainya SAMA untuk semua equipment terpilih, lalu isi nilainya. Field yang tidak
            dicentang tidak akan diubah.
          </p>

          <div className="space-y-3 rounded-md border border-border p-3">
            <BulkFieldRow
              checked={form.applyExecutionDate}
              onCheck={(v) => setForm({ ...form, applyExecutionDate: v })}
              label="Tanggal Eksekusi (Aktual)"
            >
              <Input
                type="date"
                value={form.executionDate}
                onChange={(e) => setForm({ ...form, executionDate: e.target.value })}
                disabled={!form.applyExecutionDate}
              />
            </BulkFieldRow>

            <BulkFieldRow checked={form.applyResult} onCheck={(v) => setForm({ ...form, applyResult: v })} label="Hasil">
              <Select
                value={form.result}
                onChange={(e) => setForm({ ...form, result: e.target.value as PmExecutionResult })}
                disabled={!form.applyResult}
              >
                <option value="OK">OK</option>
                <option value="NOT_OK">NOT OK</option>
              </Select>
            </BulkFieldRow>

            <BulkFieldRow
              checked={form.applyVendorPersonnel}
              onCheck={(v) => setForm({ ...form, applyVendorPersonnel: v })}
              label="Teknisi Vendor"
            >
              <Input
                value={form.vendorPersonnel}
                onChange={(e) => setForm({ ...form, vendorPersonnel: e.target.value })}
                disabled={!form.applyVendorPersonnel}
                maxLength={150}
              />
            </BulkFieldRow>

            <BulkFieldRow checked={form.applyStatus} onCheck={(v) => setForm({ ...form, applyStatus: v })} label="Status">
              <Select
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value as PmExecutionStatus })}
                disabled={!form.applyStatus}
              >
                <option value="PENDING">Pending</option>
                <option value="COMPLETED">Completed</option>
              </Select>
            </BulkFieldRow>

            <BulkFieldRow checked={form.applyFindings} onCheck={(v) => setForm({ ...form, applyFindings: v })} label="Temuan">
              <Textarea
                value={form.findings}
                onChange={(e) => setForm({ ...form, findings: e.target.value })}
                disabled={!form.applyFindings}
                maxLength={1000}
              />
            </BulkFieldRow>

            <BulkFieldRow
              checked={form.applyActionTaken}
              onCheck={(v) => setForm({ ...form, applyActionTaken: v })}
              label="Tindakan yang Dilakukan"
            >
              <Textarea
                value={form.actionTaken}
                onChange={(e) => setForm({ ...form, actionTaken: e.target.value })}
                disabled={!form.applyActionTaken}
                maxLength={1000}
              />
            </BulkFieldRow>
          </div>

          {form.checklist.length > 0 && (
            <div>
              <Label>Checklist</Label>
              <div className="space-y-2 rounded-md border border-border p-3">
                {form.checklist.map((item, index) => (
                  <div key={item.activityTypeName + index} className="flex items-center gap-2 border-b border-border pb-2 last:border-0 last:pb-0">
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-border"
                      checked={item.apply}
                      onChange={(e) => updateChecklistDraft(index, { apply: e.target.checked })}
                    />
                    <span className="flex-1 text-sm text-text">{item.activityTypeName}</span>
                    <Select
                      className="w-28"
                      value={item.result}
                      onChange={(e) => updateChecklistDraft(index, { result: e.target.value as PmChecklistResult })}
                      disabled={!item.apply}
                    >
                      <option value="OK">OK</option>
                      <option value="NOT_OK">NOT OK</option>
                      <option value="NA">N/A</option>
                    </Select>
                    <Input
                      className="w-40"
                      placeholder="Catatan"
                      value={item.notes}
                      onChange={(e) => updateChecklistDraft(index, { notes: e.target.value })}
                      disabled={!item.apply}
                      maxLength={500}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Batal
            </Button>
            <Button type="submit" disabled={updateMutation.isPending}>
              {updateMutation.isPending ? 'Menyimpan...' : `Terapkan ke ${executions.length} Equipment`}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function BulkFieldRow({
  checked,
  onCheck,
  label,
  children,
}: {
  checked: boolean;
  onCheck: (checked: boolean) => void;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-3">
      <input
        type="checkbox"
        className="mt-2.5 h-4 w-4 rounded border-border"
        checked={checked}
        onChange={(e) => onCheck(e.target.checked)}
      />
      <div className="flex-1">
        <Label>{label}</Label>
        {children}
      </div>
    </div>
  );
}
