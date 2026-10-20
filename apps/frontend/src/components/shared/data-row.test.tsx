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
});
