import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useAuthStore, type AuthUser } from '@/store/auth.store';
import type { PermissionAction, PermissionsMap } from '@/types/permissions';
import { SparePartListPage } from './spare-part-list-page';

// Yang diuji: tombol Bulk Upload HANYA untuk Admin, apa pun isi matriks permission-nya.
vi.mock('../hooks/use-spare-parts', () => ({
  useSpareParts: () => ({ data: { data: [], meta: { total: 0, page: 1, limit: 20, totalPages: 1 } }, isLoading: false }),
  useDeleteSparePart: () => ({ mutateAsync: vi.fn() }),
}));
vi.mock('../components/spare-part-table', () => ({ SparePartTable: () => null }));
vi.mock('../components/spare-part-form-dialog', () => ({ SparePartFormDialog: () => null }));
vi.mock('../components/spare-part-detail-dialog', () => ({ SparePartDetailDialog: () => null }));
vi.mock('../components/stock-movement-dialog', () => ({ StockMovementDialog: () => null }));
vi.mock('../components/spare-part-bulk-upload-dialog', () => ({ SparePartBulkUploadDialog: () => null }));

function loginAs(role: string, sparePart: Partial<Record<PermissionAction, boolean>>) {
  const none = { view: false, create: false, edit: false, delete: false };
  const permissions = new Proxy({} as PermissionsMap, {
    get: (_t, module: string) => (module === 'SPARE_PART' ? { ...none, ...sparePart } : none),
  });
  const user: AuthUser = { id: 'u1', email: 'u@x.com', fullName: 'User', role, roleId: 'r1', permissions };
  useAuthStore.setState({ user, token: 't', isAuthenticated: true, isHydrated: true });
}

const renderPage = () => render(<MemoryRouter><SparePartListPage /></MemoryRouter>);

describe('SparePartListPage — tombol Bulk Upload', () => {
  beforeEach(() => vi.clearAllMocks());
  afterEach(() => useAuthStore.getState().logout());

  it('Admin melihat tombol Bulk Upload', () => {
    loginAs('Admin', { view: true, create: true });
    renderPage();
    expect(screen.getByRole('button', { name: /bulk upload/i })).toBeInTheDocument();
  });

  it('Teknisi yang punya hak create TIDAK melihat Bulk Upload (tapi tetap bisa Tambah)', () => {
    loginAs('Teknisi', { view: true, create: true, edit: true });
    renderPage();
    expect(screen.queryByRole('button', { name: /bulk upload/i })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /tambah spare part/i })).toBeInTheDocument();
  });

  it('role View tidak melihat Bulk Upload', () => {
    loginAs('View', { view: true });
    renderPage();
    expect(screen.queryByRole('button', { name: /bulk upload/i })).not.toBeInTheDocument();
  });
});
