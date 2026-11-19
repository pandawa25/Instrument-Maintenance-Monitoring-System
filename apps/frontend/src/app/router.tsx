import { lazy, Suspense } from 'react';
import type { ReactNode } from 'react';
import { createBrowserRouter, Navigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { RequireAuth, RequireRole, RequirePermission } from './providers/route-guards';
import { LoadingState } from '@/components/shared/loading-state';

// Route-based code splitting (Risk #26, docs/roadmap.md) — sebelumnya SEMUA halaman
// di-import statis di sini, jadi masuk 1 bundle JS awal (~1.3 MB sebelum gzip, lihat
// warning `vite build`). Dengan `lazy()`, tiap halaman jadi chunk terpisah yang baru
// di-download pas rute itu diakses — pengguna yang cuma pakai Dashboard+Equipment tidak
// perlu men-download kode Settings/User Management/PM Program dkk di awal.
const LoginPage = lazy(() => import('@/features/auth/pages/login-page').then((m) => ({ default: m.LoginPage })));
const DashboardPage = lazy(() =>
  import('@/features/dashboard/pages/dashboard-page').then((m) => ({ default: m.DashboardPage })),
);
const AreaListPage = lazy(() => import('@/features/areas/pages/area-list-page').then((m) => ({ default: m.AreaListPage })));
const EquipmentListPage = lazy(() =>
  import('@/features/equipment/pages/equipment-list-page').then((m) => ({ default: m.EquipmentListPage })),
);
const EquipmentDetailPage = lazy(() =>
  import('@/features/equipment/pages/equipment-detail-page').then((m) => ({ default: m.EquipmentDetailPage })),
);
const InstrumentNameListPage = lazy(() =>
  import('@/features/instrument-names/pages/instrument-name-list-page').then((m) => ({
    default: m.InstrumentNameListPage,
  })),
);
const MaintenanceListPage = lazy(() =>
  import('@/features/maintenance/pages/maintenance-list-page').then((m) => ({ default: m.MaintenanceListPage })),
);
const MaintenanceDetailPage = lazy(() =>
  import('@/features/maintenance/pages/maintenance-detail-page').then((m) => ({ default: m.MaintenanceDetailPage })),
);
const MaintenanceHistoryPage = lazy(() =>
  import('@/features/maintenance-history/pages/maintenance-history-page').then((m) => ({
    default: m.MaintenanceHistoryPage,
  })),
);
const UserManagementPage = lazy(() =>
  import('@/features/users/pages/user-management-page').then((m) => ({ default: m.UserManagementPage })),
);
const RolePermissionPage = lazy(() =>
  import('@/features/permissions/pages/role-permission-page').then((m) => ({ default: m.RolePermissionPage })),
);
const VendorListPage = lazy(() =>
  import('@/features/vendors/pages/vendor-list-page').then((m) => ({ default: m.VendorListPage })),
);
const PmActivityTypeListPage = lazy(() =>
  import('@/features/pm-activity-types/pages/pm-activity-type-list-page').then((m) => ({
    default: m.PmActivityTypeListPage,
  })),
);
const PmProgramListPage = lazy(() =>
  import('@/features/pm-programs/pages/pm-program-list-page').then((m) => ({ default: m.PmProgramListPage })),
);
const PmProgramDetailPage = lazy(() =>
  import('@/features/pm-programs/pages/pm-program-detail-page').then((m) => ({ default: m.PmProgramDetailPage })),
);
const SparePartListPage = lazy(() =>
  import('@/features/spare-parts/pages/spare-part-list-page').then((m) => ({ default: m.SparePartListPage })),
);
const StockInPage = lazy(() =>
  import('@/features/spare-parts/pages/stock-in-page').then((m) => ({ default: m.StockInPage })),
);
const StockOutPage = lazy(() =>
  import('@/features/spare-parts/pages/stock-out-page').then((m) => ({ default: m.StockOutPage })),
);
const InventoryDashboardPage = lazy(() =>
  import('@/features/spare-parts/pages/inventory-dashboard-page').then((m) => ({
    default: m.InventoryDashboardPage,
  })),
);
const WorkOrderListPage = lazy(() =>
  import('@/features/work-orders/pages/work-order-list-page').then((m) => ({ default: m.WorkOrderListPage })),
);

// Fallback dipasang per-rute (bukan 1 Suspense besar membungkus seluruh router) supaya
// pindah halaman tidak membuat Sidebar/TopHeader ikut unmount — cuma area <Outlet/>
// yang menampilkan loading state, sama seperti behavior loading data tabel biasa.
function withSuspense(element: ReactNode) {
  return <Suspense fallback={<LoadingState message="Memuat halaman..." />}>{element}</Suspense>;
}

export const router = createBrowserRouter([
  { path: '/', element: <Navigate to="/dashboard" replace /> },
  { path: '/login', element: withSuspense(<LoginPage />) },
  {
    element: <RequireAuth />,
    children: [
      {
        element: <RequirePermission module="DASHBOARD" />,
        children: [
          {
            element: <DashboardLayout title="Dashboard" />,
            children: [{ path: '/dashboard', element: withSuspense(<DashboardPage />) }],
          },
        ],
      },
      {
        element: <RequirePermission module="AREA" />,
        children: [
          {
            element: <DashboardLayout title="Master Area" />,
            children: [{ path: '/areas', element: withSuspense(<AreaListPage />) }],
          },
        ],
      },
      {
        element: <RequirePermission module="EQUIPMENT" />,
        children: [
          {
            element: <DashboardLayout title="Master Equipment" />,
            children: [
              { path: '/equipment', element: withSuspense(<EquipmentListPage />) },
              { path: '/equipment/:id', element: withSuspense(<EquipmentDetailPage />) },
            ],
          },
        ],
      },
      {
        element: <RequirePermission module="INSTRUMENT_NAME" />,
        children: [
          {
            element: <DashboardLayout title="Master Instrument Name" />,
            children: [{ path: '/instrument-names', element: withSuspense(<InstrumentNameListPage />) }],
          },
        ],
      },
      {
        // History Maintenance read-only dan memakai hak CORRECTIVE_MAINTENANCE (view) —
        // lihat catatan di MaintenanceHistoryController.
        element: <RequirePermission module="CORRECTIVE_MAINTENANCE" />,
        children: [
          {
            element: <DashboardLayout title="History Maintenance" />,
            children: [{ path: '/maintenance-history', element: withSuspense(<MaintenanceHistoryPage />) }],
          },
          {
            element: <DashboardLayout title="Corrective Maintenance" />,
            children: [
              { path: '/maintenance', element: withSuspense(<MaintenanceListPage />) },
              { path: '/maintenance/:id', element: withSuspense(<MaintenanceDetailPage />) },
            ],
          },
        ],
      },
      {
        element: <RequirePermission module="VENDOR" />,
        children: [
          {
            element: <DashboardLayout title="Master Vendor" />,
            children: [{ path: '/vendors', element: withSuspense(<VendorListPage />) }],
          },
        ],
      },
      {
        element: <RequirePermission module="PM_ACTIVITY_TYPE" />,
        children: [
          {
            element: <DashboardLayout title="Master PM Activity Type" />,
            children: [{ path: '/pm-activity-types', element: withSuspense(<PmActivityTypeListPage />) }],
          },
        ],
      },
      {
        element: <RequirePermission module="SPARE_PART" />,
        children: [
          {
            element: <DashboardLayout title="Master Spare Part / Material" />,
            children: [{ path: '/spare-parts', element: withSuspense(<SparePartListPage />) }],
          },
          {
            element: <DashboardLayout title="Stock In" />,
            children: [{ path: '/spare-parts/stock-in', element: withSuspense(<StockInPage />) }],
          },
          {
            element: <DashboardLayout title="Stock Out" />,
            children: [{ path: '/spare-parts/stock-out', element: withSuspense(<StockOutPage />) }],
          },
          {
            element: <DashboardLayout title="Inventory Dashboard" />,
            children: [{ path: '/spare-parts/dashboard', element: withSuspense(<InventoryDashboardPage />) }],
          },
        ],
      },
      {
        // List & create periode butuh akses PM_PROGRAM; halaman detail sendiri
        // membedakan lebih lanjut canEditProgram (PM_PROGRAM) vs canEditExecution
        // (PM_EXECUTION) di dalam komponennya — Vendor tetap bisa masuk ke sini
        // karena punya PM_PROGRAM view meski tidak punya PM_PROGRAM edit/create.
        element: <RequirePermission module="PM_PROGRAM" />,
        children: [
          {
            element: <DashboardLayout title="Preventive Maintenance" />,
            children: [
              { path: '/pm-programs', element: withSuspense(<PmProgramListPage />) },
              { path: '/pm-programs/:id', element: withSuspense(<PmProgramDetailPage />) },
            ],
          },
        ],
      },
      {
        element: <RequirePermission module="WORK_ORDER" />,
        children: [
          {
            element: <DashboardLayout title="Work Order & Notifikasi" />,
            children: [{ path: '/work-orders', element: withSuspense(<WorkOrderListPage />) }],
          },
        ],
      },
      {
        element: <RequireRole roles={['Admin']} />,
        children: [
          {
            element: <DashboardLayout title="User Management" />,
            children: [{ path: '/users', element: withSuspense(<UserManagementPage />) }],
          },
          {
            element: <DashboardLayout title="Matriks Role & Permission" />,
            children: [{ path: '/settings/roles', element: withSuspense(<RolePermissionPage />) }],
          },
        ],
      },
    ],
  },
  { path: '*', element: <Navigate to="/dashboard" replace /> },
]);
