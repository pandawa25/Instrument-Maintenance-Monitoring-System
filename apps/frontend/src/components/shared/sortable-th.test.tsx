import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { SortableTh, toggleSort } from './sortable-th';

describe('toggleSort', () => {
  it('field baru (belum aktif) -> mulai dari desc', () => {
    expect(toggleSort({ sortBy: 'name', sortOrder: 'asc' }, 'date')).toEqual({ sortBy: 'date', sortOrder: 'desc' });
    expect(toggleSort({}, 'date')).toEqual({ sortBy: 'date', sortOrder: 'desc' });
  });

  it('field sama -> toggle asc/desc', () => {
    expect(toggleSort({ sortBy: 'date', sortOrder: 'desc' }, 'date')).toEqual({ sortBy: 'date', sortOrder: 'asc' });
    expect(toggleSort({ sortBy: 'date', sortOrder: 'asc' }, 'date')).toEqual({ sortBy: 'date', sortOrder: 'desc' });
  });
});

describe('SortableTh', () => {
  it('klik memanggil onSort dengan field-nya', async () => {
    const onSort = vi.fn();
    render(
      <table>
        <thead>
          <tr>
            <SortableTh label="Tanggal" field="date" onSort={onSort} />
          </tr>
        </thead>
      </table>,
    );

    await userEvent.click(screen.getByRole('button', { name: /urutkan berdasarkan tanggal/i }));
    expect(onSort).toHaveBeenCalledWith('date');
  });

  it('kolom aktif menampilkan arah sort yang sesuai (lewat label aria tombol tetap sama)', () => {
    const onSort = vi.fn();
    const { rerender } = render(
      <table>
        <thead>
          <tr>
            <SortableTh label="Tanggal" field="date" sortBy="date" sortOrder="asc" onSort={onSort} />
          </tr>
        </thead>
      </table>,
    );
    expect(screen.getByText('Tanggal')).toBeInTheDocument();

    rerender(
      <table>
        <thead>
          <tr>
            <SortableTh label="Tanggal" field="date" sortBy="other" sortOrder="asc" onSort={onSort} />
          </tr>
        </thead>
      </table>,
    );
    expect(screen.getByText('Tanggal')).toBeInTheDocument();
  });
});
