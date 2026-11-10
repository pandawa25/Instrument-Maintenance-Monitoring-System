import { useState } from 'react';
import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import {
  buildMonthGrid,
  buildPresets,
  formatRangeLabel,
  isSameDay,
  isWithinRange,
  parseInputDate,
  toInputDate,
  type DateRange,
} from '../utils/date-range';

interface Props {
  value: DateRange;
  onChange: (range: DateRange) => void;
}

const WEEKDAY_LABELS = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'];

export function DateRangePicker({ value, onChange }: Props) {
  const [open, setOpen] = useState(false);
  // Draft lokal — perubahan kalender/preset baru di-apply ke parent saat "Terapkan".
  const [draft, setDraft] = useState<DateRange>(value);
  const [pickingFrom, setPickingFrom] = useState(true);
  const [visibleMonth, setVisibleMonth] = useState(() => parseInputDate(value.from));

  const presets = buildPresets();

  function handleOpenChange(next: boolean) {
    if (next) {
      setDraft(value);
      setPickingFrom(true);
      setVisibleMonth(parseInputDate(value.from));
    }
    setOpen(next);
  }

  function pickDay(date: Date) {
    const iso = toInputDate(date);
    if (pickingFrom) {
      setDraft({ from: iso, to: iso });
      setPickingFrom(false);
    } else {
      const from = parseInputDate(draft.from);
      if (date < from) {
        setDraft({ from: iso, to: draft.from });
      } else {
        setDraft({ from: draft.from, to: iso });
      }
      setPickingFrom(true);
    }
  }

  function applyPreset(range: DateRange) {
    setDraft(range);
    setPickingFrom(true);
  }

  function handleApply() {
    onChange(draft);
    setOpen(false);
  }

  const secondMonth = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() + 1, 1);

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="flex items-center gap-2 rounded-lg border border-border bg-surface px-3 py-2 text-sm font-medium text-text shadow-sm transition-colors hover:border-primary/50"
        >
          <CalendarDays className="h-4 w-4 text-text-muted" />
          {formatRangeLabel(value)}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0">
        <div className="flex flex-col sm:flex-row">
          <div className="flex w-full flex-col gap-0.5 border-b border-border p-2 sm:w-44 sm:border-b-0 sm:border-r">
            {presets.map((preset) => (
              <button
                key={preset.key}
                type="button"
                onClick={() => applyPreset(preset.getRange())}
                className="rounded-md px-2.5 py-1.5 text-left text-sm text-text transition-colors hover:bg-surface-2"
              >
                {preset.label}
              </button>
            ))}
          </div>

          <div className="p-3">
            <div className="flex items-center justify-between pb-2">
              <button
                type="button"
                onClick={() => setVisibleMonth(new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() - 1, 1))}
                className="rounded-md p-1 text-text-muted transition-colors hover:bg-surface-2 hover:text-text"
                aria-label="Bulan sebelumnya"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="text-xs text-text-muted">
                Pilih tanggal {pickingFrom ? 'mulai' : 'akhir'}
              </span>
              <button
                type="button"
                onClick={() => setVisibleMonth(new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() + 1, 1))}
                className="rounded-md p-1 text-text-muted transition-colors hover:bg-surface-2 hover:text-text"
                aria-label="Bulan berikutnya"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>

            <div className="flex gap-4">
              <MonthCalendar month={visibleMonth} draft={draft} onPickDay={pickDay} />
              <MonthCalendar month={secondMonth} draft={draft} onPickDay={pickDay} />
            </div>

            <div className="mt-3 flex items-center justify-between border-t border-border pt-3">
              <span className="text-xs text-text-muted">{formatRangeLabel(draft)}</span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="rounded-md px-3 py-1.5 text-sm font-medium text-text-muted transition-colors hover:bg-surface-2"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleApply}
                  className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-primary-dim"
                >
                  Terapkan
                </button>
              </div>
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

function MonthCalendar({
  month,
  draft,
  onPickDay,
}: {
  month: Date;
  draft: DateRange;
  onPickDay: (date: Date) => void;
}) {
  const days = buildMonthGrid(month);
  const from = parseInputDate(draft.from);
  const to = parseInputDate(draft.to);
  const today = new Date();

  return (
    <div className="w-[220px]">
      <div className="mb-2 text-center text-sm font-medium text-text">
        {month.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })}
      </div>
      <div className="grid grid-cols-7 gap-y-1 text-center text-[11px] text-text-muted">
        {WEEKDAY_LABELS.map((d) => (
          <div key={d}>{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-y-1 text-center text-xs">
        {days.map(({ date, inCurrentMonth }) => {
          const inRange = isWithinRange(date, from, to);
          const isEdge = isSameDay(date, from) || isSameDay(date, to);
          return (
            <button
              key={date.toISOString()}
              type="button"
              onClick={() => onPickDay(date)}
              className={cn(
                'mx-auto flex h-7 w-7 items-center justify-center rounded-full transition-colors',
                !inCurrentMonth && 'text-text-muted/40',
                inCurrentMonth && !inRange && 'text-text hover:bg-surface-2',
                inRange && !isEdge && 'bg-primary/10 text-primary',
                isEdge && 'bg-primary text-white',
                isSameDay(date, today) && !isEdge && 'ring-1 ring-primary/40',
              )}
            >
              {date.getDate()}
            </button>
          );
        })}
      </div>
    </div>
  );
}
