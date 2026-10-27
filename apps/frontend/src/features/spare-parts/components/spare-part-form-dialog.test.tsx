import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const mutateAsync = vi.fn().mockResolvedValue({});
vi.mock('../hooks/use-spare-parts', () => ({
  useCreateSparePart: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useUpdateSparePart: () => ({ mutateAsync, isPending: false }),
  useSparePartDetail: (_id: string, enabled: boolean) => ({
    data: enabled ? { openingStock: 10, stock: 12 } : undefined,
    isLoading: false,
    isError: false,
  }),
}));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

import { SparePartFormDialog } from './spare-part-form-dialog';

const part: any = {
  id: 'sp-1', kimap: 'K1', name: 'Valve', unit: 'pcs', stock: 12, minStock: 2, status: 'ACTIVE', remarks: null,
  createdAt: '', updatedAt: '',
};

describe('SparePartFormDialog — koreksi stok awal', () => {
  beforeEach(() => { mutateAsync.mockClear(); });

  it('Admin: field Stok Awal terisi saldo awal (bukan stock saat ini) dan bisa diedit', async () => {
    render(<SparePartFormDialog open onOpenChange={() => {}} sparePart={part} />);
    const input = (await screen.findByLabelText('Stok Awal')) as HTMLInputElement;
    await waitFor(() => expect(input.value).toBe('10'));
    expect(input).not.toBeDisabled();
  });

  it('mengubah stok awal menampilkan proyeksi stock dan mengirim openingStock saat simpan', async () => {
    const user = userEvent.setup();
    render(<SparePartFormDialog open onOpenChange={() => {}} sparePart={part} />);
    const input = await screen.findByLabelText('Stok Awal');
    await waitFor(() => expect((input as HTMLInputElement).value).toBe('10'));
    await user.clear(input);
    await user.type(input, '15');
    expect(screen.getByText(/Stock saat ini/)).toHaveTextContent(/menjadi\s*17/);
    await user.click(screen.getByRole('button', { name: 'Simpan' }));
    expect(mutateAsync).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'sp-1', payload: expect.objectContaining({ openingStock: 15 }) }),
    );
  });

  it('tanpa perubahan: openingStock tidak ikut dikirim', async () => {
    const user = userEvent.setup();
    render(<SparePartFormDialog open onOpenChange={() => {}} sparePart={part} />);
    await waitFor(() => expect((screen.getByLabelText('Stok Awal') as HTMLInputElement).value).toBe('10'));
    await user.click(screen.getByRole('button', { name: 'Simpan' }));
    expect(mutateAsync.mock.calls[0][0].payload).not.toHaveProperty('openingStock');
  });

  it('penurunan yang tetap aman (stock ≥ 0) tidak memblokir tombol Simpan', async () => {
    const user = userEvent.setup();
    render(<SparePartFormDialog open onOpenChange={() => {}} sparePart={part} />);
    const input = await screen.findByLabelText('Stok Awal');
    await waitFor(() => expect((input as HTMLInputElement).value).toBe('10'));
    await user.clear(input);
    await user.type(input, '0'); // 12 + (0-10) = 2
    expect(screen.getByText(/Stock saat ini/)).toHaveTextContent(/menjadi\s*2/);
    expect(screen.getByRole('button', { name: 'Simpan' })).not.toBeDisabled();
  });

  it('tidak bergantung pada role: user dengan hak edit (mis. Teknisi) mendapat field Stok Awal yang bisa diedit', async () => {
    render(<SparePartFormDialog open onOpenChange={() => {}} sparePart={part} />);
    const input = (await screen.findByLabelText('Stok Awal')) as HTMLInputElement;
    await waitFor(() => expect(input.value).toBe('10'));
    expect(input).not.toBeDisabled();
  });
});
