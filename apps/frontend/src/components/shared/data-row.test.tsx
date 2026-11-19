import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { dataRowProps } from './data-row';

function Row({ onOpen }: { onOpen?: () => void }) {
  return (
    <table>
      <tbody>
        <tr data-testid="row" {...dataRowProps(onOpen)}>
          <td>Isi sel</td>
          <td>
            <input type="checkbox" aria-label="pilih" />
            <button>Aksi</button>
            <a href="#x">Tautan</a>
            <button>
              <svg data-testid="icon" />
            </button>
          </td>
        </tr>
      </tbody>
    </table>
  );
}

describe('dataRowProps', () => {
  it('tanpa onOpen: hanya styling baris, tidak clickable', () => {
    render(<Row />);
    const row = screen.getByTestId('row');
    expect(row).toHaveClass('data-row');
    expect(row).not.toHaveClass('data-row-click');
  });

  it('dengan onOpen: klik sel membuka; klik checkbox/tombol/tautan/ikon di dalam tombol tidak', async () => {
    const open = vi.fn();
    render(<Row onOpen={open} />);
    expect(screen.getByTestId('row')).toHaveClass('data-row-click');

    await userEvent.click(screen.getByText('Isi sel'));
    expect(open).toHaveBeenCalledTimes(1);

    await userEvent.click(screen.getByRole('checkbox', { name: 'pilih' }));
    await userEvent.click(screen.getByRole('button', { name: 'Aksi' }));
    await userEvent.click(screen.getByRole('link', { name: 'Tautan' }));
    await userEvent.click(screen.getByTestId('icon')); // ikon SVG di dalam <button>
    expect(open).toHaveBeenCalledTimes(1);
  });

  it('dengan onOpen: tabIndex=0 supaya baris bisa di-Tab (Risk #24)', () => {
    render(<Row onOpen={vi.fn()} />);
    expect(screen.getByTestId('row')).toHaveAttribute('tabindex', '0');
  });

  it('tanpa onOpen: tidak tabIndex (baris memang tidak clickable)', () => {
    render(<Row />);
    expect(screen.getByTestId('row')).not.toHaveAttribute('tabindex');
  });

  it('Enter di baris (fokus di sel, bukan di elemen interaktif) membuka detail', async () => {
    const open = vi.fn();
    render(<Row onOpen={open} />);
    const row = screen.getByTestId('row');
    row.focus();
    await userEvent.keyboard('{Enter}');
    expect(open).toHaveBeenCalledTimes(1);
  });

  it('Space di baris membuka detail', async () => {
    const open = vi.fn();
    render(<Row onOpen={open} />);
    screen.getByTestId('row').focus();
    await userEvent.keyboard(' ');
    expect(open).toHaveBeenCalledTimes(1);
  });

  it('Enter saat fokus di tombol/tautan di dalam baris TIDAK ikut membuka detail (biar perilaku tombolnya sendiri jalan)', async () => {
    const open = vi.fn();
    render(<Row onOpen={open} />);
    screen.getByRole('button', { name: 'Aksi' }).focus();
    await userEvent.keyboard('{Enter}');
    expect(open).not.toHaveBeenCalled();
  });

  it('tombol lain (Tab/Escape) tidak memicu onOpen', async () => {
    const open = vi.fn();
    render(<Row onOpen={open} />);
    screen.getByTestId('row').focus();
    await userEvent.keyboard('{Tab}');
    expect(open).not.toHaveBeenCalled();
  });
});
