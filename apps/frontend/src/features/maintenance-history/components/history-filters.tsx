import { RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Tabs, type TabItem } from '@/components/ui/tabs';
import type { HistoryFilters as Filters } from '../types/maintenance-history.types';

export const DEFAULT_HISTORY_FILTERS: Filters = { type: 'ALL', dateFrom: '', dateTo: '' };

const TYPE_TABS: TabItem[] = [
  { value: 'ALL', label: 'Semua' },
  { value: 'CORRECTIVE', label: 'Corrective' },
  { value: 'PREVENTIVE', label: 'Preventive' },
];

export function isFiltered(filters: Filters): boolean {
  return filters.type !== 'ALL' || Boolean(filters.dateFrom) || Boolean(filters.dateTo);
}

export function HistoryFilters({ value, onChange }: { value: Filters; onChange: (next: Filters) => void }) {
  return (
    <Card className="px-4 pt-1">
      <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-3">
        <Tabs
          tabs={TYPE_TABS}
          value={value.type}
          onChange={(type) => onChange({ ...value, type: type as Filters['type'] })}
          className="border-b-0"
        />

        <div className="flex flex-wrap items-end gap-3 pb-3">
          <div>
            <label htmlFor="history-date-from" className="mb-1 block text-xs font-medium text-text-muted">
              Dari Tanggal
            </label>
            <Input
              id="history-date-from"
              type="date"
              className="w-40"
              value={value.dateFrom}
              max={value.dateTo || undefined}
              onChange={(e) => onChange({ ...value, dateFrom: e.target.value })}
            />
          </div>
          <div>
            <label htmlFor="history-date-to" className="mb-1 block text-xs font-medium text-text-muted">
              Sampai Tanggal
            </label>
            <Input
              id="history-date-to"
              type="date"
              className="w-40"
              value={value.dateTo}
              min={value.dateFrom || undefined}
              onChange={(e) => onChange({ ...value, dateTo: e.target.value })}
            />
          </div>
          <Button variant="outline" onClick={() => onChange(DEFAULT_HISTORY_FILTERS)} disabled={!isFiltered(value)}>
            <RotateCcw className="h-4 w-4" />
            Reset
          </Button>
        </div>
      </div>
    </Card>
  );
}
