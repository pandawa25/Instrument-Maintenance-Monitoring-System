import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { HighlightToggleButton } from './highlight-toggle-button';

describe('HighlightToggleButton', () => {
  it('belum di-highlight: bintang kosong, klik memanggil onToggle', async () => {
    const onToggle = vi.fn();
    render(<HighlightToggleButton isHighlighted={false} onToggle={onToggle} canEdit />);

    const button = screen.getByRole('button', { name: 'Tandai sebagai highlight' });
    expect(button).toHaveAttribute('aria-pressed', 'false');

    await userEvent.click(button);
    expect(onToggle).toHaveBeenCalledTimes(1);
  });

  it('sudah di-highlight: label & aria-pressed berbeda', () => {
    render(<HighlightToggleButton isHighlighted onToggle={vi.fn()} canEdit />);
    const button = screen.getByRole('button', { name: 'Batalkan highlight' });
    expect(button).toHaveAttribute('aria-pressed', 'true');
  });

  it('tanpa hak edit (canEdit=false): tombol disabled, klik tidak memanggil onToggle', async () => {
    const onToggle = vi.fn();
    render(<HighlightToggleButton isHighlighted={false} onToggle={onToggle} canEdit={false} />);

    const button = screen.getByRole('button', { name: 'Tandai sebagai highlight' });
    expect(button).toBeDisabled();

    await userEvent.click(button);
    expect(onToggle).not.toHaveBeenCalled();
  });

  it('isLoading=true: tombol disabled meski canEdit', () => {
    render(<HighlightToggleButton isHighlighted={false} onToggle={vi.fn()} canEdit isLoading />);
    expect(screen.getByRole('button', { name: 'Tandai sebagai highlight' })).toBeDisabled();
  });

  it('klik tidak ikut membuka baris tabel (stopPropagation)', async () => {
    const onToggle = vi.fn();
    const onRowClick = vi.fn();
    render(
      <table>
        <tbody>
          <tr onClick={onRowClick}>
            <td>
              <HighlightToggleButton isHighlighted={false} onToggle={onToggle} canEdit />
            </td>
          </tr>
        </tbody>
      </table>,
    );

    await userEvent.click(screen.getByRole('button', { name: 'Tandai sebagai highlight' }));
    expect(onToggle).toHaveBeenCalledTimes(1);
    expect(onRowClick).not.toHaveBeenCalled();
  });
});
