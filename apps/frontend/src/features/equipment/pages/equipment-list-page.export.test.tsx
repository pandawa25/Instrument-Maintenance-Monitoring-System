import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useAuthStore, type AuthUser } from '@/store/auth.store';
import type { PermissionAction, PermissionsMap } from '@/types/permissions';
import { EquipmentListPage } from './equipment-list-page';

// Hook data & komponen berat di-stub — yang diuji di sini HANYA visibilitas tombol Export
// menurut hak akses user.
vi.mock('../hooks/use-equipment', () => ({
  useEquipmentList: () => ({ data: { data: [], meta: { total: 0, page: 1, limit: 20, totalPages: 1 } }, isLoading: false }),
  useEquipmentStatusCounts: () => ({ data: undefined, isLoading: false }),
  useManufacturers: () => ({ data: [] }),
  useDeleteEquipment: () => ({ mutateAsync: vi.fn() }),
}));
vi.mock('../hooks/use-equipment-lookups', () => ({
  useAreasLookup: () => ({ data: [] }),
  useInstrumentNames: () => ({ data: [] }),
}));
vi.mock('../components/equipment-table', () => ({ EquipmentTable: () => null }));
vi.mock('../components/equipment-form-dialog', () => ({ EquipmentFormDialog: () => null }));
vi.mock('../components/equipment-bulk-upload-dialog', () => ({ EquipmentBulkUploadDialog: () => null }));
vi.mock('../components/equipment-bulk-edit-dialog', () => ({ EquipmentBulkEditDialog: () => null }));
vi.mock('../components/equipment-rollback-dialog', () => ({ EquipmentRollbackDialog: () => null }));
vi.mock('../components/equipment-summary-cards', () => ({ EquipmentSummaryCards: () => null }));

function permissions(equipment: Partial<Record<PermissionAction, boolean>>): PermissionsMap {
  const none = { view: false, create: false, edit: false, delete: false };
  const map = new Proxy({} as PermissionsMap, {
    get: (_t, module: string) => (module === 'EQUIPMENT' ? { ...none, ...equipment } : none),
  });
  return map;
}

function loginAs(role: string, equipment: Partial<Record<PermissionAction, boolean>>) {
  const user: AuthUser = {
    id: 'u1',
    email: 'u@x.com',
    fullName: 'User',
    role,
    roleId: 'r1',
    permissions: permissions(equipment),
  };
  useAuthStore.setState({ user, token: 't', isAuthenticated: true, isHydrated: true });
}

function renderPage() {
  render(
    <MemoryRouter>
      <EquipmentListPage />
    </MemoryRouter>,
  );
}

describe('EquipmentListPage — tombol Export', () => {
  beforeEach(() => vi.clearAllMocks());
  afterEach(() => useAuthStore.getState().logout());

  it('role View (read-only) TIDAK melihat tombol Export', () => {
    loginAs('View', { view: true });
    renderPage();
    expect(screen.queryByRole('button', { name: /export/i })).not.toBeInTheDocument();
  });

  it('role dengan hak edit melihat tombol Export', () => {
    loginAs('Teknisi', { view: true, create: false, edit: true });
    renderPage();
    expect(screen.getByRole('button', { name: /export/i })).toBeInTheDocument();
  });

  it('role dengan hak create melihat tombol Export', () => {
    loginAs('Teknisi', { view: true, create: true });
    renderPage();
    expect(screen.getByRole('button', { name: /export/i })).toBeInTheDocument();
  });

  it('Admin (semua hak) melihat tombol Export', () => {
    loginAs('Admin', { view: true, create: true, edit: true, delete: true });
    renderPage();
    expect(screen.getByRole('button', { name: /export/i })).toBeInTheDocument();
  });
});
