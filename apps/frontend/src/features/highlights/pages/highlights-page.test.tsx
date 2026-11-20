import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useAuthStore } from '@/store/auth.store';
import { HighlightsPage } from './highlights-page';
import type { HighlightItem } from '../types/highlight.types';

const fetchHighlightsMock = vi.fn();
const setMaintenanceHighlightedMock = vi.fn();
const setPmPeriodExecutionHighlightedMock = vi.fn();
const setWorkOrderHighlightedMock = vi.fn();

vi.mock('../api/highlights.api', () => ({
  fetchHighlights: (...args: unknown[]) => fetchHighlightsMock(...args),
}));
vi.mock('@/features/maintenance/api/maintenance.api', () => ({
  setMaintenanceHighlighted: (...args: unknown[]) => setMaintenanceHighlightedMock(...args),
}));
vi.mock('@/features/pm-programs/api/pm-period-executions.api', () => ({
  setPmPeriodExecutionHighlighted: (...args: unknown[]) => setPmPeriodExecutionHighlightedMock(...args),
}));
vi.mock('@/features/work-orders/api/work-orders.api', () => ({
  setWorkOrderHighlighted: (...args: unknown[]) => setWorkOrderHighlightedMock(...args),
}));

const ITEMS: HighlightItem[] = [
  {
    id: 'cm-1',
    type: 'CORRECTIVE_MAINTENANCE',
    linkTo: '/maintenance/cm-1',
    title: 'Control valve macet',
    date: '2026-11-10T00:00:00.000Z',
    status: 'OPEN',
    equipmentTag: 'FV-101',
    equipmentService: 'Feed',
  },
  {
    id: 'pm-1',
    type: 'PM_EXECUTION',
    linkTo: '/pm-programs/prog-1?openExecution=pm-1',
    title: 'PM Vibrasi — Periode 3',
    date: '2026-11-05T00:00:00.000Z',
    status: 'PENDING',
    equipmentTag: 'VT-201',
    equipmentService: 'Compressor',
  },
  {
    id: 'wo-1',
    type: 'WORK_ORDER',
    linkTo: '/work-orders?open=wo-1',
    title: '400001 — Ganti seal',
    date: '2026-11-01T00:00:00.000Z',
    status: 'RELEASED',
    equipmentTag: 'PT-301',
    equipmentService: null,
  },
];

function renderPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <HighlightsPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('HighlightsPage', () => {
  beforeEach(() => {
    fetchHighlightsMock.mockReset();
    setMaintenanceHighlightedMock.mockReset();
    setPmPeriodExecutionHighlightedMock.mockReset();
    setWorkOrderHighlightedMock.mockReset();
    // Admin — semua hak edit true, supaya tombol unhighlight aktif di semua baris.
    useAuthStore.setState({
      user: {
        id: 'u-1',
        email: 'admin@example.com',
        fullName: 'Admin',
        role: 'Admin',
        roleId: 'r-1',
        permissions: {
          CORRECTIVE_MAINTENANCE: { view: true, create: true, edit: true, delete: true },
          PM_EXECUTION: { view: true, create: true, edit: true, delete: true },
          WORK_ORDER: { view: true, create: true, edit: true, delete: true },
        } as any,
      },
      isAuthenticated: true,
    });
  });

  it('kosong -> pesan empty state', async () => {
    fetchHighlightsMock.mockResolvedValue([]);
    renderPage();
    expect(await screen.findByText(/belum ada pekerjaan yang di-highlight/i)).toBeInTheDocument();
  });

  it('menampilkan gabungan 3 tipe pekerjaan, terurut sesuai urutan dari server', async () => {
    fetchHighlightsMock.mockResolvedValue(ITEMS);
    renderPage();

    expect(await screen.findByText('Control valve macet')).toBeInTheDocument();
    expect(screen.getByText('PM Vibrasi — Periode 3')).toBeInTheDocument();
    expect(screen.getByText('400001 — Ganti seal')).toBeInTheDocument();
    expect(screen.getByText('FV-101')).toBeInTheDocument();
    expect(screen.getByText('VT-201')).toBeInTheDocument();
    expect(screen.getByText('PT-301')).toBeInTheDocument();
  });

  it('klik tombol bintang pada baris Corrective Maintenance membatalkan highlight item itu saja', async () => {
    fetchHighlightsMock.mockResolvedValue(ITEMS);
    setMaintenanceHighlightedMock.mockResolvedValue({ ...ITEMS[0], isHighlighted: false });
    const user = userEvent.setup();
    renderPage();

    await screen.findByText('Control valve macet');
    const toggleButtons = screen.getAllByRole('button', { name: 'Batalkan highlight' });
    await user.click(toggleButtons[0]);

    await waitFor(() => expect(setMaintenanceHighlightedMock).toHaveBeenCalledWith('cm-1', false));
    expect(setPmPeriodExecutionHighlightedMock).not.toHaveBeenCalled();
    expect(setWorkOrderHighlightedMock).not.toHaveBeenCalled();
  });

  it('klik baris (bukan tombol bintang) tidak memicu mutasi apa pun', async () => {
    fetchHighlightsMock.mockResolvedValue(ITEMS);
    const user = userEvent.setup();
    renderPage();

    await user.click(await screen.findByText('400001 — Ganti seal'));
    expect(setWorkOrderHighlightedMock).not.toHaveBeenCalled();
  });
});
