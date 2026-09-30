import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, CalendarClock, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/shared/status-badge';
import { PageHeader } from '@/components/shared/page-header';
import { LoadingState } from '@/components/shared/loading-state';
import { useAuthStore } from '@/store/auth.store';
import { usePmProgramDetail } from '../hooks/use-pm-programs';
import { usePmPeriods } from '../hooks/use-pm-periods';
import { PmPeriodList } from '../components/pm-period-list';
import { PmPeriodCreateDialog } from '../components/pm-period-create-dialog';
import { PmExecutionFormDialog } from '../components/pm-execution-form-dialog';
import { addFrequencyInterval, toDateInputValue } from '../utils/frequency';

const FREQUENCY_UNIT_LABEL: Record<string, string> = {
  DAY: 'Hari',
  WEEK: 'Minggu',
  MONTH: 'Bulan',
  YEAR: 'Tahun',
};

export function PmProgramDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const role = useAuthStore((s) => s.user?.role);
  const canEdit = role === 'Admin';

  const [periodDialogOpen, setPeriodDialogOpen] = useState(false);
  const [executionId, setExecutionId] = useState<string | null>(null);

  const { data: program, isLoading: isLoadingProgram } = usePmProgramDetail(id);
  const { data: periods, isLoading: isLoadingPeriods } = usePmPeriods(id);

  const { suggestedDate, nextPeriodNumber } = useMemo(() => {
    if (!program) return { suggestedDate: toDateInputValue(new Date()), nextPeriodNumber: 1 };
    const latest = periods?.[0]; // findManyByProgram orders periodNumber desc
    const baseDate = latest ? new Date(latest.plannedDate) : new Date(program.startDate);
    const next = latest ? addFrequencyInterval(baseDate, program.frequencyValue, program.frequencyUnit) : baseDate;
    return {
      suggestedDate: toDateInputValue(next),
      nextPeriodNumber: (latest?.periodNumber ?? 0) + 1,
    };
  }, [program, periods]);

  if (isLoadingProgram || !program) {
    return <LoadingState />;
  }

  return (
    <div className="space-y-5">
      <div>
        <Button variant="ghost" size="sm" onClick={() => navigate('/pm-programs')}>
          <ArrowLeft className="h-4 w-4" />
          Kembali ke daftar PM Program
        </Button>
      </div>

      <PageHeader
        icon={CalendarClock}
        title={program.name}
        description={`Vendor: ${program.vendor.name} · Frekuensi: ${program.frequencyValue} ${
          FREQUENCY_UNIT_LABEL[program.frequencyUnit] ?? program.frequencyUnit
        } · Mulai ${new Date(program.startDate).toLocaleDateString('id-ID')}`}
        action={<StatusBadge value={program.status} />}
      />

      <div className="rounded-xl border border-border/70 bg-surface p-5 shadow-sm">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <SummaryStat label="Total Equipment" value={program.equipment.length} />
          <SummaryStat label="Total Periode" value={program.totalPeriod} />
          <SummaryStat label="Checklist Item" value={program.checklistItems.length} />
        </div>

        {program.equipment.length > 0 && (
          <div className="mt-4">
            <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-text-muted">Equipment Tercakup</p>
            <div className="flex flex-wrap gap-1.5">
              {program.equipment.map((eq) => (
                <span key={eq.id} className="rounded-md border border-border bg-surface-2 px-2 py-0.5 text-xs text-text">
                  {eq.tagNumber}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold text-text">Periode PM</h3>
        {canEdit && (
          <Button size="sm" onClick={() => setPeriodDialogOpen(true)}>
            <Plus className="h-4 w-4" />
            Tambah Periode
          </Button>
        )}
      </div>

      {isLoadingPeriods ? (
        <LoadingState message="Memuat periode..." />
      ) : (
        <PmPeriodList periods={periods ?? []} canEdit={canEdit} onFillExecution={setExecutionId} />
      )}

      {id && (
        <PmPeriodCreateDialog
          open={periodDialogOpen}
          onOpenChange={setPeriodDialogOpen}
          programId={id}
          suggestedDate={suggestedDate}
          nextPeriodNumber={nextPeriodNumber}
        />
      )}

      <PmExecutionFormDialog
        open={Boolean(executionId)}
        onOpenChange={(open) => !open && setExecutionId(null)}
        executionId={executionId}
        canEdit={canEdit}
      />
    </div>
  );
}

function SummaryStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-border bg-surface-2 px-3 py-2">
      <p className="text-xs text-text-muted">{label}</p>
      <p className="text-lg font-semibold text-text">{value}</p>
    </div>
  );
}
