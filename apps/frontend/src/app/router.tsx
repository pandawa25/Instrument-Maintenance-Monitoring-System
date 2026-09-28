import { createBrowserRouter, Navigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { RequireAuth, RequireRole } from './providers/route-guards';
import { LoginPage } from '@/features/auth/pages/login-page';
import { DashboardPage } from '@/features/dashboard/pages/dashboard-page';
import { AreaListPage } from '@/features/areas/pages/area-list-page';
import { EquipmentListPage } from '@/features/equipment/pages/equipment-list-page';
import { MaintenanceListPage } from '@/features/maintenance/pages/maintenance-list-page';
import { UserManagementPage } from '@/features/users/pages/user-management-page';

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
        children: [{ path: '/equipment', element: <EquipmentListPage /> }],
      },
      {
        element: <DashboardLayout title="Corrective Maintenance" />,
        children: [{ path: '/maintenance', element: <MaintenanceListPage /> }],
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
