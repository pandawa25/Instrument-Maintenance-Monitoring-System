import { createBrowserRouter, Navigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { RequireAuth, RequireRole } from './providers/route-guards';
import { LoginPage } from '@/features/auth/pages/login-page';
import { DashboardPage } from '@/features/dashboard/pages/dashboard-page';
import { AreaListPage } from '@/features/areas/pages/area-list-page';
import { EquipmentListPage } from '@/features/equipment/pages/equipment-list-page';
import { EquipmentDetailPage } from '@/features/equipment/pages/equipment-detail-page';
import { InstrumentNameListPage } from '@/features/instrument-names/pages/instrument-name-list-page';
import { MaintenanceListPage } from '@/features/maintenance/pages/maintenance-list-page';
import { MaintenanceDetailPage } from '@/features/maintenance/pages/maintenance-detail-page';
import { UserManagementPage } from '@/features/users/pages/user-management-page';
import { VendorListPage } from '@/features/vendors/pages/vendor-list-page';
import { PmActivityTypeListPage } from '@/features/pm-activity-types/pages/pm-activity-type-list-page';
import { PmProgramListPage } from '@/features/pm-programs/pages/pm-program-list-page';
import { PmProgramDetailPage } from '@/features/pm-programs/pages/pm-program-detail-page';
import { SparePartListPage } from '@/features/spare-parts/pages/spare-part-list-page';
import { StockInPage } from '@/features/spare-parts/pages/stock-in-page';
import { StockOutPage } from '@/features/spare-parts/pages/stock-out-page';
import { InventoryDashboardPage } from '@/features/spare-parts/pages/inventory-dashboard-page';

export const router = createBrowserRouter([
  { path: '/', element: <Navigate to="/dashboard" replace /> },
  { path: '/login', element: <LoginPage /> },
  {
    element: <RequireAuth />,
    children: [
      {
        element: <DashboardLayout title="Dashboard" />,
        children: [{ path: '/dashboard', element: <DashboardPage /> }],
      },
      {
        element: <DashboardLayout title="Master Area" />,
        children: [{ path: '/areas', element: <AreaListPage /> }],
      },
      {
        element: <DashboardLayout title="Master Equipment" />,
        children: [
          { path: '/equipment', element: <EquipmentListPage /> },
          { path: '/equipment/:id', element: <EquipmentDetailPage /> },
        ],
      },
      {
        element: <DashboardLayout title="Master Instrument Name" />,
        children: [{ path: '/instrument-names', element: <InstrumentNameListPage /> }],
      },
      {
        element: <DashboardLayout title="Corrective Maintenance" />,
        children: [
          { path: '/maintenance', element: <MaintenanceListPage /> },
          { path: '/maintenance/:id', element: <MaintenanceDetailPage /> },
        ],
      },
      {
        element: <DashboardLayout title="Master Vendor" />,
        children: [{ path: '/vendors', element: <VendorListPage /> }],
      },
      {
        element: <DashboardLayout title="Master PM Activity Type" />,
        children: [{ path: '/pm-activity-types', element: <PmActivityTypeListPage /> }],
      },
      {
        element: <DashboardLayout title="Master Spare Part / Material" />,
        children: [{ path: '/spare-parts', element: <SparePartListPage /> }],
      },
      {
        element: <DashboardLayout title="Stock In" />,
        children: [{ path: '/spare-parts/stock-in', element: <StockInPage /> }],
      },
      {
        element: <DashboardLayout title="Stock Out" />,
        children: [{ path: '/spare-parts/stock-out', element: <StockOutPage /> }],
      },
      {
        element: <DashboardLayout title="Inventory Dashboard" />,
        children: [{ path: '/spare-parts/dashboard', element: <InventoryDashboardPage /> }],
      },
      {
        element: <DashboardLayout title="Preventive Maintenance" />,
        children: [
          { path: '/pm-programs', element: <PmProgramListPage /> },
          { path: '/pm-programs/:id', element: <PmProgramDetailPage /> },
        ],
      },
      {
        element: <RequireRole roles={['Admin']} />,
        children: [
          {
            element: <DashboardLayout title="User Management" />,
            children: [{ path: '/users', element: <UserManagementPage /> }],
          },
        ],
      },
    ],
  },
  { path: '*', element: <Navigate to="/dashboard" replace /> },
]);
