import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { OPTION_PT101, OPTION_PT102, TOP_PT101, TOP_PT102 } from '../test-fixtures';
import { EquipmentSearchPanel } from './equipment-search-panel';

const searchMock = vi.fn();
const topMock = vi.fn();
vi.mock('../api/maintenance-history.api', () => ({
  searchHistoryEquipment: (...args: unknown[]) => searchMock(...args),
  fetchTopEquipment: (...args: unknown[]) => topMock(...args),
  fetchEquipmentHistory: vi.fn(),
}));

function renderPanel(onShow = vi.fn()) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <EquipmentSearchPanel onShow={onShow} />
      </MemoryRouter>
    </QueryClientProvider>,
  );
  return { onShow };
}

describe('EquipmentSearchPanel', () => {
  beforeEach(() => {
    searchMock.mockReset();
    topMock.mockReset();
    topMock.mockResolvedValue([]);
  });

  it('halaman awal: belum ada pencarian, tombol Tampilkan History nonaktif', async () => {
    renderPanel();
    expect(await screen.findByText(/belum ada data maintenance/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /tampilkan history/i })).toBeDisabled();
    expect(searchMock).not.toHaveBeenCalled();
  });

  it('halaman awal menampilkan Top 10 (peringkat, jumlah CM/PM) dan klik baris langsung membuka history', async () => {
    topMock.mockResolvedValue([TOP_PT101, TOP_PT102]);
    const user = userEvent.setup();
    const { onShow } = renderPanel();

    expect(topMock).toHaveBeenCalledWith(10);
    const first = await screen.findByRole('button', { name: /buka history PT-101/i });
    expect(first).toHaveTextContent('8');
    expect(first).toHaveTextContent('CM 5 · PM 3');
    expect(first).toHaveTextContent(/terakhir 5 Sep 2026/);
    expect(screen.getByRole('button', { name: /buka history PT-102/i })).toHaveTextContent('CM 2 · PM 2');

    await user.click(first);
    expect(onShow).toHaveBeenCalledWith('eq-1');
  });

  it('mengetik menggantikan Top 10 dengan hasil pencarian; dikosongkan kembali ke Top 10', async () => {
    topMock.mockResolvedValue([TOP_PT101]);
    searchMock.mockResolvedValue([OPTION_PT102]);
    const user = userEvent.setup();
    renderPanel();

    await screen.findByRole('button', { name: /buka history PT-101/i });
    const input = screen.getByLabelText(/cari tag number/i);
    await user.type(input, 'PT-102');
    await screen.findByRole('option', { name: /PT-102/ });
    expect(screen.queryByRole('button', { name: /buka history PT-101/i })).toBeNull();

    await user.clear(input);
    expect(await screen.findByRole('button', { name: /buka history PT-101/i })).toBeInTheDocument();
  });

  it('gagal memuat Top 10: pesan error + coba lagi, pencarian tetap bisa dipakai', async () => {
    topMock.mockRejectedValueOnce(new Error('x')).mockResolvedValue([TOP_PT101]);
    const user = userEvent.setup();
    renderPanel();

    expect(await screen.findByText(/gagal memuat daftar equipment teratas/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/cari tag number/i)).toBeEnabled();
    await user.click(screen.getByRole('button', { name: /coba lagi/i }));
    expect(await screen.findByRole('button', { name: /buka history PT-101/i })).toBeInTheDocument();
  });

  it('cari -> pilih hasil -> tombol aktif -> onShow dipanggil dengan id equipment', async () => {
    searchMock.mockResolvedValue([OPTION_PT101, OPTION_PT102]);
    const user = userEvent.setup();
    const { onShow } = renderPanel();

    await user.type(screen.getByLabelText(/cari tag number/i), 'PT-10');
    const option = await screen.findByRole('option', { name: /PT-102/ });
    expect(searchMock).toHaveBeenCalledWith('PT-10');

    await user.click(option);
    expect(screen.getByTestId('selected-equipment')).toHaveTextContent('PT-102');
    expect(screen.getByRole('option', { name: /PT-102/ })).toHaveAttribute('aria-selected', 'true');

    const button = screen.getByRole('button', { name: /tampilkan history/i });
    expect(button).toBeEnabled();
    await user.click(button);
    expect(onShow).toHaveBeenCalledWith('eq-2');
  });

  it('Enter memilih satu-satunya hasil, Enter lagi menampilkan history', async () => {
    searchMock.mockResolvedValue([OPTION_PT101]);
    const user = userEvent.setup();
    const { onShow } = renderPanel();

    const input = screen.getByLabelText(/cari tag number/i);
    await user.type(input, 'PT-101');
    await screen.findByRole('option', { name: /PT-101/ });

    await user.keyboard('{Enter}');
    expect(screen.getByTestId('selected-equipment')).toHaveTextContent('PT-101');
    expect(onShow).not.toHaveBeenCalled();

    await user.keyboard('{Enter}');
    expect(onShow).toHaveBeenCalledWith('eq-1');
  });

  it('Enter pada beberapa hasil memilih yang cocok persis dengan tag', async () => {
    searchMock.mockResolvedValue([OPTION_PT101, OPTION_PT102]);
    const user = userEvent.setup();
    renderPanel();

    await user.type(screen.getByLabelText(/cari tag number/i), 'pt-102');
    await screen.findByRole('option', { name: /PT-102/ });
    await user.keyboard('{Enter}');
    expect(screen.getByTestId('selected-equipment')).toHaveTextContent('PT-102');
  });

  it('tanpa hasil -> pesan kosong; hapus pilihan menonaktifkan tombol lagi', async () => {
    searchMock.mockResolvedValueOnce([OPTION_PT101]).mockResolvedValue([]);
    const user = userEvent.setup();
    renderPanel();

    const input = screen.getByLabelText(/cari tag number/i);
    await user.type(input, 'PT-101');
    await user.click(await screen.findByRole('option', { name: /PT-101/ }));
    await user.click(screen.getByRole('button', { name: /hapus pilihan/i }));
    expect(screen.getByRole('button', { name: /tampilkan history/i })).toBeDisabled();

    await user.clear(input);
    await user.type(input, 'ZZZ');
    await waitFor(() => expect(screen.getByText(/tidak ada equipment yang cocok/i)).toBeInTheDocument());
  });
});
