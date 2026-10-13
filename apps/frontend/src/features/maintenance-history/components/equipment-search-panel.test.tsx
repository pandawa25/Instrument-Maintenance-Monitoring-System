import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { OPTION_PT101, OPTION_PT102 } from '../test-fixtures';
import { EquipmentSearchPanel } from './equipment-search-panel';

const searchMock = vi.fn();
vi.mock('../api/maintenance-history.api', () => ({
  searchHistoryEquipment: (...args: unknown[]) => searchMock(...args),
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
  });

  it('halaman awal: belum ada pencarian, tombol Tampilkan History nonaktif', () => {
    renderPanel();
    expect(screen.getByText(/mulai mengetik/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /tampilkan history/i })).toBeDisabled();
    expect(searchMock).not.toHaveBeenCalled();
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
