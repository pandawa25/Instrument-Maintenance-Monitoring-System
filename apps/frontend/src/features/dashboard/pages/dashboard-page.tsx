import { useState } from 'react';
import { Gauge, ShieldCheck, Wrench } from 'lucide-react';
import { Tabs, TabPanel } from '@/components/ui/tabs';
import { useDashboardCharts, useDashboardRecent, useDashboardSummary } from '../hooks/use-dashboard';
import { SummaryCards } from '../components/summary-cards';
import {
  EquipmentByAreaChart,
  EquipmentByCriticalityChart,
  EquipmentByStatusChart,
  EquipmentByTypeChart,
  MaintenanceByAreaChart,
  MaintenanceByCategoryChart,
  MaintenanceTrendChart,
  PmComplianceChart,
} from '../components/dashboard-charts';
import { LatestMaintenanceTable, UpcomingPmList } from '../components/dashboard-recent';
import { KpiSection } from '../components/kpi-section';
import { HealthIndexSection } from '../components/health-index-section';

const DASHBOARD_TABS = [
  { value: 'equipment', label: 'Sebaran Equipment', icon: Gauge },
  { value: 'maintenance', label: 'Aktivitas Maintenance', icon: Wrench },
  { value: 'reliability', label: 'KPI & Reliability', icon: ShieldCheck },
];

export function DashboardPage() {
  const [tab, setTab] = useState(DASHBOARD_TABS[0].value);

  const { data: summary, isLoading: summaryLoading } = useDashboardSummary();
  const { data: charts, isLoading: chartsLoading } = useDashboardCharts();
  const { data: recent, isLoading: recentLoading } = useDashboardRecent();

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-text">Dashboard</h2>
        <p className="text-sm text-text-muted">Ringkasan kondisi maintenance instrumentasi terkini.</p>
      </div>

      <SummaryCards summary={summary} isLoading={summaryLoading} />

      <Tabs tabs={DASHBOARD_TABS} value={tab} onChange={setTab} />

      <TabPanel active={tab === 'equipment'}>
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          <EquipmentByAreaChart data={charts?.equipmentByArea} isLoading={chartsLoading} />
          <EquipmentByTypeChart data={charts?.equipmentByType} isLoading={chartsLoading} />
          <EquipmentByStatusChart data={charts?.equipmentByStatus} isLoading={chartsLoading} />
          <EquipmentByCriticalityChart data={charts?.equipmentByCriticality} isLoading={chartsLoading} />
        </div>
      </TabPanel>

      <TabPanel active={tab === 'maintenance'}>
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            <MaintenanceTrendChart data={charts?.maintenanceByMonth} isLoading={chartsLoading} />
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

      <TabPanel active={tab === 'reliability'}>
        <div className="space-y-4">
          <KpiSection />
          <div className="border-t border-border pt-4">
            <HealthIndexSection />
          </div>
        </div>
      </TabPanel>
    </div>
  );
}
