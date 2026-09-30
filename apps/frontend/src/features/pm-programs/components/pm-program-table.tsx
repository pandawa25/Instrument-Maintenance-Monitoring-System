import { Pencil, Trash2, Eye, CalendarClock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/shared/status-badge';
import { LoadingState } from '@/components/shared/loading-state';
import { EmptyState } from '@/components/shared/empty-state';
import type { PmProgramListItem } from '../types/pm-program.types';

const FREQUENCY_UNIT_LABEL: Record<string, string> = {
  DAY: 'Hari',
  WEEK: 'Minggu',
  MONTH: 'Bulan',
  YEAR: 'Tahun',
};

interface Props {
  programs: PmProgramListItem[];
  isLoading: boolean;
  canEdit: boolean;
  onEdit: (program: PmProgramListItem) => void;
  onDelete: (program: PmProgramListItem) => void;
  onView: (program: PmProgramListItem) => void;
}

export function PmProgramTable({ programs, isLoading, canEdit, onEdit, onDelete, onView }: Props) {
  if (isLoading) {
    return <LoadingState />;
  }

  if (programs.length === 0) {
    return <EmptyState icon={CalendarClock} message="Belum ada data PM Program." />;
  }

  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="border-b border-border bg-surface-2 text-left text-xs uppercase tracking-wide text-text-muted">
          <th className="px-4 py-2.5 font-medium">Judul PM Program</th>
          <th className="px-4 py-2.5 font-medium">Vendor</th>
          <th className="px-4 py-2.5 font-medium">Frekuensi</th>
          <th className="px-4 py-2.5 font-medium">Mulai</th>
          <th className="px-4 py-2.5 font-medium text-center">Equipment</th>
          <th className="px-4 py-2.5 font-medium text-center">Periode</th>
          <th className="px-4 py-2.5 font-medium">Status</th>
          <th className="px-4 py-2.5 font-medium text-right">Action</th>
        </tr>
      </thead>
      <tbody>
        {programs.map((program) => (
          <tr
            key={program.id}
            className="cursor-pointer border-b border-border last:border-0 hover:bg-surface-2/60"
            onClick={() => onView(program)}
          >
            <td className="px-4 py-2.5 font-medium text-text">{program.name}</td>
            <td className="px-4 py-2.5 text-text-muted">{program.vendor.name}</td>
            <td className="px-4 py-2.5 text-text-muted">
              {program.frequencyValue} {FREQUENCY_UNIT_LABEL[program.frequencyUnit] ?? program.frequencyUnit}
            </td>
            <td className="px-4 py-2.5 text-text-muted">{new Date(program.startDate).toLocaleDateString('id-ID')}</td>
            <td className="px-4 py-2.5 text-center text-text">{program.totalEquipment}</td>
            <td className="px-4 py-2.5 text-center text-text">{program.totalPeriod}</td>
            <td className="px-4 py-2.5">
              <StatusBadge value={program.status} />
            </td>
            <td className="px-4 py-2.5" onClick={(e) => e.stopPropagation()}>
              <div className="flex justify-end gap-1">
                <Button variant="ghost" size="icon" onClick={() => onView(program)} title="Lihat Periode">
                  <Eye className="h-4 w-4" />
                </Button>
                {canEdit && (
                  <>
                    <Button variant="ghost" size="icon" onClick={() => onEdit(program)} title="Edit">
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => onDelete(program)} title="Delete">
                      <Trash2 className="h-4 w-4 text-danger" />
                    </Button>
                  </>
                )}
              </div>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
