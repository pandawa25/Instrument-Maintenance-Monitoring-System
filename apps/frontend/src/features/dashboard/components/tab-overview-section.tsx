import { useEffect, useState } from 'react';
import { ClickableSummaryCards, type ClickableCardDef } from './clickable-summary-cards';
import { TrendChart } from './trend-chart';
import { useDashboardTrendBatch } from '../hooks/use-dashboard';
import type { DateRange } from '../utils/date-range';
import type { TrendMetric } from '../types/dashboard.types';

interface Props {
  cards: ClickableCardDef[];
  chartTitle: string;
  range: DateRange;
}

// Pola "kotak summary clickable + 1 grafik tren" yang dipakai di semua tab
// Dashboard — klik salah satu kotak mengganti metric yang digambar di
// TrendChart di bawahnya. Total tiap kotak & data chart metric aktif sama-sama
// diambil lewat endpoint /dashboard/trend (di-batch per tab lewat useQueries).
export function TabOverviewSection({ cards, chartTitle, range }: Props) {
  const [activeMetric, setActiveMetric] = useState<TrendMetric>(cards[0].metric);

  // Kalau tab berganti (daftar cards berubah) dan metric aktif sebelumnya tidak
  // relevan lagi, reset ke kotak pertama tab ini.
  useEffect(() => {
    if (!cards.some((c) => c.metric === activeMetric)) {
      setActiveMetric(cards[0].metric);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cards]);

  const metrics = cards.map((c) => c.metric);
  const results = useDashboardTrendBatch(metrics, range.from, range.to);

  const values: Partial<Record<TrendMetric, number>> = {};
  let anyLoading = false;
  results.forEach((result, idx) => {
    const metric = metrics[idx];
    if (result.isLoading) anyLoading = true;
    if (result.data) {
      values[metric] = result.data.reduce((sum, point) => sum + point.value, 0);
    }
  });

  const activeIndex = metrics.indexOf(activeMetric);
  const activeResult = activeIndex >= 0 ? results[activeIndex] : undefined;
  const activeCard = cards.find((c) => c.metric === activeMetric) ?? cards[0];

  return (
    <div className="space-y-4">
      <ClickableSummaryCards
        cards={cards}
        values={values}
        isLoading={anyLoading}
        activeMetric={activeMetric}
        onSelect={setActiveMetric}
      />
      <TrendChart
        title={`${chartTitle} — ${activeCard.label}`}
        label={activeCard.label}
        data={activeResult?.data}
        isLoading={activeResult?.isLoading ?? true}
      />
    </div>
  );
}
