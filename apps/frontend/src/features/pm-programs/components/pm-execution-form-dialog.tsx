import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { LoadingState } from '@/components/shared/loading-state';
import { AttachmentsSection } from '@/features/attachments/components/attachments-section';
import { usePmPeriodExecution, useUpdatePmPeriodExecution } from '../hooks/use-pm-period-executions';
import type { PmChecklistResult, PmExecutionResult, PmExecutionStatus } from '../types/pm-period.types';

interface FormState {
  executionDate: string;
  result: PmExecutionResult | '';
  findings: string;
  actionTaken: string;
  vendorPersonnel: string;
  remarks: string;
  status: PmExecutionStatus;
  workOrderNumber: string;
  workOrderDate: string;
  workOrderStatus: string;
  checklistResults: { id: string; result: PmChecklistResult; notes: string }[];
}

const EMPTY_FORM: FormState = {
  executionDate: '',
  result: '',
  findings: '',
  actionTaken: '',
  vendorPersonnel: '',
  remarks: '',
  status: 'PENDING',
  workOrderNumber: '',
  workOrderDate: '',
  workOrderStatus: '',
  checklistResults: [],
};

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  executionId: string | null;
  canEdit: boolean;
}

export function PmExecutionFormDialog({ open, onOpenChange, executionId, canEdit }: Props) {
  const [form, setForm] = useState<FormState>(EMPTY_FORM);

  const { data: execution, isLoading } = usePmPeriodExecution(executionId ?? undefined);
  const updateMutation = useUpdatePmPeriodExecution();

  useEffect(() => {
    if (open && execution) {
      setForm({
        executionDate: execution.executionDate ? execution.executionDate.slice(0, 10) : '',
        result: execution.result ?? '',
        findings: execution.findings ?? '',
        actionTaken: execution.actionTaken ?? '',
        vendorPersonnel: execution.vendorPersonnel ?? '',
        remarks: execution.remarks ?? '',
        status: execution.status,
        workOrderNumber: execution.workOrderNumber ?? '',
        workOrderDate: execution.workOrderDate ? execution.workOrderDate.slice(0, 10) : '',
        workOrderStatus: execution.workOrderStatus ?? '',
        checklistResults: execution.checklistResults.map((c) => ({ id: c.id, result: c.result, notes: c.notes ?? '' })),
      });
    }
  }, [open, execution]);

  function updateChecklist(id: string, patch: Partial<{ result: PmChecklistResult; notes: string }>) {
    setForm((f) => ({
      ...f,
      checklistResults: f.checklistResults.map((c) => (c.id === id ? { ...c, ...patch } : c)),
    }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!executionId) return;
    try {
      await updateMutation.mutateAsync({
        id: executionId,
        payload: {
          executionDate: form.executionDate || undefined,
          result: form.result || undefined,
          findings: form.findings || undefined,
          actionTaken: form.actionTaken || undefined,
          vendorPersonnel: form.vendorPersonnel || undefined,
          remarks: form.remarks || undefined,
          status: form.status,
          workOrderNumber: form.workOrderNumber || undefined,
          workOrderDate: form.workOrderDate || undefined,
          workOrderStatus: form.workOrderStatus || undefined,
          checklistResults: form.checklistResults.map(({ id, result, notes }) => ({ id, result, notes: notes || undefined })),
        },
      });
      toast.success('Hasil eksekusi PM berhasil disimpan');
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'Gagal menyimpan hasil eksekusi PM');
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            Isi Hasil PM {execution ? `— ${execution.equipment.tagNumber}` : ''}
          </DialogTitle>
        </DialogHeader>

        {isLoading || !execution ? (
          <LoadingState />
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="executionDate">Tanggal Eksekusi (Aktual)</Label>
                <Input
                  id="executionDate"
                  type="date"
                  value={form.executionDate}
                  onChange={(e) => setForm({ ...form, executionDate: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="result">Hasil</Label>
                <Select
                  id="result"
                  value={form.result}
                  onChange={(e) => setForm({ ...form, result: e.target.value as PmExecutionResult })}
                >
                  <option value="">— Belum ditentukan —</option>
                  <option value="OK">OK</option>
                  <option value="NOT_OK">NOT OK</option>
                </Select>
              </div>
              <div>
                <Label htmlFor="vendorPersonnel">Teknisi Vendor</Label>
                <Input
                  id="vendorPersonnel"
                  value={form.vendorPersonnel}
                  onChange={(e) => setForm({ ...form, vendorPersonnel: e.target.value })}
                  maxLength={150}
                />
              </div>
              <div>
                <Label htmlFor="status">Status</Label>
                <Select
                  id="status"
                  value={form.status}
                  onChange={(e) => setForm({ ...form, status: e.target.value as PmExecutionStatus })}
                >
                  <option value="PENDING">Pending</option>
                  <option value="COMPLETED">Completed</option>
                </Select>
              </div>
              <div className="col-span-2">
                <Label htmlFor="findings">Temuan</Label>
                <Textarea
                  id="findings"
                  value={form.findings}
                  onChange={(e) => setForm({ ...form, findings: e.target.value })}
                  maxLength={1000}
                />
              </div>
              <div className="col-span-2">
                <Label htmlFor="actionTaken">Tindakan yang Dilakukan</Label>
                <Textarea
                  id="actionTaken"
                  value={form.actionTaken}
                  onChange={(e) => setForm({ ...form, actionTaken: e.target.value })}
                  maxLength={1000}
                />
              </div>
              <div className="col-span-2">
                <Label htmlFor="remarks">Remarks</Label>
                <Input id="remarks" value={form.remarks} onChange={(e) => setForm({ ...form, remarks: e.target.value })} maxLength={500} />
              </div>
            </div>

            <div className="rounded-md border border-border p-3">
              <p className="mb-3 text-sm font-medium text-text">Informasi Work Order (ERP)</p>
              <p className="mb-3 text-xs text-text-muted">
                Diisi manual sebagai referensi setelah WO diterbitkan di sistem ERP (mis. SAP PM). Opsional.
              </p>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <Label htmlFor="workOrderNumber">No. Work Order</Label>
                  <Input
                    id="workOrderNumber"
                    value={form.workOrderNumber}
                    onChange={(e) => setForm({ ...form, workOrderNumber: e.target.value })}
                    maxLength={50}
                  />
                </div>
                <div>
                  <Label htmlFor="workOrderDate">Tanggal WO</Label>
                  <Input
                    id="workOrderDate"
                    type="date"
                    value={form.workOrderDate}
                    onChange={(e) => setForm({ ...form, workOrderDate: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="workOrderStatus">Status WO</Label>
                  <Input
                    id="workOrderStatus"
                    value={form.workOrderStatus}
                    onChange={(e) => setForm({ ...form, workOrderStatus: e.target.value })}
                    maxLength={50}
                  />
                </div>
              </div>
            </div>

            {form.checklistResults.length > 0 && (
              <div>
                <Label>Checklist</Label>
                <div className="space-y-2 rounded-md border border-border p-3">
                  {execution.checklistResults.map((item) => {
                    const value = form.checklistResults.find((c) => c.id === item.id);
                    return (
                      <div key={item.id} className="flex items-start gap-2 border-b border-border pb-2 last:border-0 last:pb-0">
                        <div className="flex-1">
                          <p className="text-sm text-text">{item.activityTypeName}</p>
                          {item.description && <p className="text-xs text-text-muted">{item.description}</p>}
                        </div>
                        <Select
                          className="w-28"
                          value={value?.result ?? 'NA'}
                          onChange={(e) => updateChecklist(item.id, { result: e.target.value as PmChecklistResult })}
                        >
                          <option value="OK">OK</option>
                          <option value="NOT_OK">NOT OK</option>
                          <option value="NA">N/A</option>
                        </Select>
                        <Input
                          className="w-40"
                          placeholder="Catatan"
                          value={value?.notes ?? ''}
                          onChange={(e) => updateChecklist(item.id, { notes: e.target.value })}
                          maxLength={500}
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <AttachmentsSection entityType="PM_PERIOD_EXECUTION" entityId={executionId ?? undefined} canEdit={canEdit} />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Batal
              </Button>
              <Button type="submit" disabled={updateMutation.isPending}>
                {updateMutation.isPending ? 'Menyimpan...' : 'Simpan'}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
