import { useMemo, useState } from 'react';
import {
  AlertTriangle,
  CalendarClock,
  CheckCircle2,
  Clock,
  ClipboardList,
  FilePlus,
  Gauge,
  Lock,
  PauseCircle,
  PlayCircle,
  ShieldCheck,
  Unlink,
  Wrench,
  XCircle,
} from 'lucide-react';
import { Tabs, TabPanel } from '@/components/ui/tabs';
import { usePermission } from '@/store/auth.store';
import { useDashboardCharts, useDashboardRecent } from '../hooks/use-dashboard';
import {
  EquipmentByAreaChart,
  EquipmentByCriticalityChart,
  EquipmentByStatusChart,
  EquipmentByTypeChart,
  MaintenanceByAreaChart,
  MaintenanceByCategoryChart,
  PmComplianceChart,
} from '../components/dashboard-charts';
import { LatestMaintenanceTable, UpcomingPmList } from '../components/dashboard-recent';
import { KpiSection } from '../components/kpi-section';
import { HealthIndexSection } from '../components/health-index-section';
import { DateRangePicker } from '../components/date-range-picker';
import { TabOverviewSection } from '../components/tab-overview-section';
import type { ClickableCardDef } from '../components/clickable-summary-cards';
import { defaultDateRange, type DateRange } from '../utils/date-range';
import { WorkOrderDashboardPanel } from '@/features/work-orders/components/work-order-dashboard-panel';

// Urutan tab: Aktivitas Maintenance jadi tab pertama/default sesuai permintaan
// desain dashboard terbaru (sebelumnya Sebaran Equipment ada di urutan pertama).
const BASE_TABS = [
  { value: 'maintenance', label: 'Aktivitas Maintenance', icon: Wrench },
  { value: 'equipment', label: 'Sebaran Equipment', icon: Gauge },
  { value: 'reliability', label: 'KPI & Reliability', icon: ShieldCheck },
];

const WORK_ORDER_TAB = { value: 'work-orders', label: 'Work Order (ERP)', icon: ClipboardList };

const MAINTENANCE_CARDS: ClickableCardDef[] = [
  { metric: 'maintenance_total', label: 'Total Maintenance', icon: Wrench, accent: 'text-primary' },
  { metric: 'maintenance_open', label: 'Open', icon: AlertTriangle, accent: 'text-danger' },
  { metric: 'maintenance_in_progress', label: 'In Progress', icon: Clock, accent: 'text-warning' },
  { metric: 'maintenance_completed', label: 'Completed', icon: CheckCircle2, accent: 'text-success' },
];

const EQUIPMENT_CARDS: ClickableCardDef[] = [
  { metric: 'equipment_total', label: 'Total Equipment', icon: Gauge, accent: 'text-primary' },
  { metric: 'equipment_active', label: 'Active', icon: CheckCircle2, accent: 'text-success' },
  { metric: 'equipment_standby', label: 'Standby', icon: PauseCircle, accent: 'text-warning' },
  { metric: 'equipment_out_of_service', label: 'Out of Service', icon: XCircle, accent: 'text-danger' },
];

const RELIABILITY_CARDS: ClickableCardDef[] = [
  { metric: 'kpi_failures', label: 'Jumlah Failure', icon: AlertTriangle, accent: 'text-danger' },
  { metric: 'kpi_downtime_hours', label: 'Downtime (Jam)', icon: Clock, accent: 'text-warning' },
  { metric: 'kpi_pm_completed', label: 'PM Completed', icon: CheckCircle2, accent: 'text-success' },
  { metric: 'kpi_pm_pending', label: 'PM Pending', icon: CalendarClock, accent: 'text-warning' },
];

const WORK_ORDER_CARDS: ClickableCardDef[] = [
  { metric: 'wo_total', label: 'Total WO', icon: ClipboardList, accent: 'text-primary' },
  { metric: 'wo_created', label: 'Created', icon: FilePlus, accent: 'text-secondary' },
  { metric: 'wo_released', label: 'Released', icon: PlayCircle, accent: 'text-primary' },
  { metric: 'wo_technically_completed', label: 'Technically Completed', icon: CheckCircle2, accent: 'text-success' },
  { metric: 'wo_closed', label: 'Closed', icon: Lock, accent: 'text-text-muted' },
  { metric: 'wo_unmatched', label: 'Belum Terhubung', icon: Unlink, accent: 'text-warning' },
];

export function DashboardPage() {
  const canViewWorkOrders = usePermission('WORK_ORDER', 'view');
  const tabs = useMemo(
    () => (canViewWorkOrders ? [...BASE_TABS, WORK_ORDER_TAB] : BASE_TABS),
    [canViewWorkOrders],
  );
  const [tab, setTab] = useState(BASE_TABS[0].value);
  const [range, setRange] = useState<DateRange>(defaultDateRange);

  const { data: charts, isLoading: chartsLoading } = useDashboardCharts();
  const { data: recent, isLoading: recentLoading } = useDashboardRecent();

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-text">Dashboard</h2>
        <p className="text-sm text-text-muted">Ringkasan kondisi maintenance instrumentasi terkini.</p>
      </div>

      <div className="flex flex-col gap-3 border-b border-border pb-0 sm:flex-row sm:items-center sm:justify-between">
        <Tabs tabs={tabs} value={tab} onChange={setTab} className="border-b-0" />
        <div className="pb-2 sm:pb-0">
          <DateRangePicker value={range} onChange={setRange} />
        </div>
      </div>

      <TabPanel active={tab === 'maintenance'}>
        <div className="space-y-4">
          <TabOverviewSection cards={MAINTENANCE_CARDS} chartTitle="Grafik Performa Maintenance" range={range} />

          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            <MaintenanceByAreaChart data={charts?.maintenanceByArea} isLoading={chartsLoading} />
            <MaintenanceByCategoryChart data={charts?.maintenanceByFailureCategory} isLoading={chartsLoading} />
            <PmComplianceChart data={charts?.pmCompliance} isLoading={chartsLoading} />
          </div>

          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            <LatestMaintenanceTable items={recent?.latestMaintenance} isLoading={recentLoading} />
            <UpcomingPmList items={recent?.upcomingPmPeriods} isLoading={recentLoading} />
          </div>
        </div>
      </TabPanel>

      <TabPanel active={tab === 'equipment'}>
        <div className="space-y-4">
          <TabOverviewSection cards={EQUIPMENT_CARDS} chartTitle="Grafik Performa Equipment" range={range} />

          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            <EquipmentByAreaChart data={charts?.equipmentByArea} isLoading={chartsLoading} />
            <EquipmentByTypeChart data={charts?.equipmentByType} isLoading={chartsLoading} />
            <EquipmentByStatusChart data={charts?.equipmentByStatus} isLoading={chartsLoading} />
            <EquipmentByCriticalityChart data={charts?.equipmentByCriticality} isLoading={chartsLoading} />
          </div>
        </div>
      </TabPanel>

      <TabPanel active={tab === 'reliability'}>
        <div className="space-y-4">
          <TabOverviewSection cards={RELIABILITY_CARDS} chartTitle="Grafik Performa Reliability" range={range} />

          <KpiSection />
          <div className="border-t border-border pt-4">
            <HealthIndexSection />
          </div>
        </div>
      </TabPanel>

      {canViewWorkOrders && (
        <TabPanel active={tab === 'work-orders'}>
          <div className="space-y-4">
            <TabOverviewSection cards={WORK_ORDER_CARDS} chartTitle="Grafik Performa Work Order" range={range} />
            <WorkOrderDashboardPanel />
          </div>
        </TabPanel>
      )}
    </div>
  );
}
