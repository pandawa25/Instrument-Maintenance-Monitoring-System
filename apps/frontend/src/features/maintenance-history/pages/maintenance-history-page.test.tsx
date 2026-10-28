import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { HISTORY_PT101, OPTION_PT101 } from '../test-fixtures';
import { MaintenanceHistoryPage } from './maintenance-history-page';

const searchMock = vi.fn();
const historyMock = vi.fn();
const topMock = vi.fn();
vi.mock('../api/maintenance-history.api', () => ({
  searchHistoryEquipment: (...args: unknown[]) => searchMock(...args),
  fetchEquipmentHistory: (...args: unknown[]) => historyMock(...args),
  fetchTopEquipment: (...args: unknown[]) => topMock(...args),
}));

function renderPage(url = '/maintenance-history') {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[url]}>
        <MaintenanceHistoryPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('MaintenanceHistoryPage', () => {
  beforeEach(() => {
    searchMock.mockReset();
    historyMock.mockReset();
    topMock.mockReset();
    topMock.mockResolvedValue([]);
  });

  it('halaman awal = pencarian; history belum diminta', () => {
    renderPage();
    expect(screen.getByRole('heading', { name: 'History Maintenance' })).toBeInTheDocument();
    expect(screen.getByLabelText(/cari tag number/i)).toBeInTheDocument();
    expect(historyMock).not.toHaveBeenCalled();
  });

  it('alur lengkap: cari -> pilih -> Tampilkan History -> header, ringkasan, material, tree', async () => {
    searchMock.mockResolvedValue([OPTION_PT101]);
    historyMock.mockResolvedValue(HISTORY_PT101);
    const user = userEvent.setup();
    renderPage();

    await user.type(screen.getByLabelText(/cari tag number/i), 'PT-101');
    await user.click(await screen.findByRole('option', { name: /PT-101/ }));
    expect(historyMock).not.toHaveBeenCalled(); // belum ditekan tombolnya
    await user.click(screen.getByRole('button', { name: /tampilkan history/i }));

    // header equipment
    expect(await screen.findByRole('heading', { name: 'PT-101' })).toBeInTheDocument();
    expect(historyMock).toHaveBeenCalledWith('eq-1', { type: 'ALL', dateFrom: '', dateTo: '' });

    // tree: bulan terbaru terbuka, urutan terbaru dulu; bulan lama tertutup
    const tree = screen.getByRole('list', { name: /tree history/i });
    const rows = within(tree).getAllByRole('link');
    expect(rows.map((a) => a.textContent)).toEqual(['Pembacaan tidak stabil']);
    expect(within(tree).getByRole('button', { name: /september 2026/i })).toHaveAttribute('aria-expanded', 'true');
    expect(within(tree).getByRole('button', { name: /agustus 2026/i })).toHaveAttribute('aria-expanded', 'false');
    expect(within(tree).getByRole('link', { name: 'Pembacaan tidak stabil' })).toHaveAttribute('href', '/maintenance/cm-2');

    // ringkasan tidak dirender sampai dibuka
    expect(screen.queryByText('Kebutuhan')).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /buka ringkasan pembacaan tidak stabil/i }));
    expect(screen.getByText('Kebutuhan')).toBeInTheDocument();

    // buka semua -> kegiatan lama ikut tampil, material yang selesai ditandai "Terpakai"
    await user.click(screen.getByRole('button', { name: /buka semua/i }));
    expect(within(tree).getByText('Transmitter drift')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /buka ringkasan transmitter drift/i }));
    expect(screen.getByText('Terpakai')).toBeInTheDocument();

    // rekap material
    const rekap = screen.getByText(/rekap pemakaian material/i).closest('div')!.parentElement!;
    expect(within(rekap).getByText('Sensor Module')).toBeInTheDocument();

    // pencarian hilang dari tampilan
    expect(screen.queryByLabelText(/cari tag number/i)).not.toBeInTheDocument();
  });

  it('deep link ?equipmentId= langsung menampilkan history', async () => {
    historyMock.mockResolvedValue(HISTORY_PT101);
    renderPage('/maintenance-history?equipmentId=eq-1');
    expect(await screen.findByRole('heading', { name: 'PT-101' })).toBeInTheDocument();
    expect(searchMock).not.toHaveBeenCalled();
  });

  it('filter jenis Corrective meminta ulang ke server dengan type=CORRECTIVE', async () => {
    historyMock.mockResolvedValue(HISTORY_PT101);
    const user = userEvent.setup();
    renderPage('/maintenance-history?equipmentId=eq-1');
    await screen.findByRole('heading', { name: 'PT-101' });

    await user.click(screen.getByRole('tab', { name: 'Corrective' }));
    await waitFor(() =>
      expect(historyMock).toHaveBeenLastCalledWith('eq-1', { type: 'CORRECTIVE', dateFrom: '', dateTo: '' }),
    );
  });

  it('"Cari equipment lain" kembali ke pencarian', async () => {
    historyMock.mockResolvedValue(HISTORY_PT101);
    const user = userEvent.setup();
    renderPage('/maintenance-history?equipmentId=eq-1');
    await screen.findByRole('heading', { name: 'PT-101' });

    await user.click(screen.getByRole('button', { name: /cari equipment lain/i }));
    expect(await screen.findByLabelText(/cari tag number/i)).toBeInTheDocument();
  });

  it('equipment tanpa riwayat -> pesan kosong', async () => {
    historyMock.mockResolvedValue({
      ...HISTORY_PT101,
      events: [],
      summary: { ...HISTORY_PT101.summary, totalEvents: 0, correctiveCount: 0, preventiveCount: 0, materialUsage: [], lastActivityDate: null },
    });
    renderPage('/maintenance-history?equipmentId=eq-1');
    expect(await screen.findByText(/belum ada riwayat maintenance/i)).toBeInTheDocument();
  });

  it('error dari server (mis. equipment tidak ditemukan) -> pesan + tombol cari lagi', async () => {
    historyMock.mockRejectedValue({ response: { data: { message: 'Equipment tidak ditemukan' } } });
    renderPage('/maintenance-history?equipmentId=eq-x');
    expect(await screen.findByText('Equipment tidak ditemukan')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /cari equipment lain/i })).toBeInTheDocument();
  });
});
