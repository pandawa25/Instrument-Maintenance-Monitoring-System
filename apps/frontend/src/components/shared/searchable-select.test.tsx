import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { SearchableSelect, type SearchableSelectOption } from './searchable-select';

const OPTIONS: SearchableSelectOption[] = [
  { value: 'pt-001', label: 'PT-001', sublabel: 'Pressure Transmitter' },
  { value: 'pt-002', label: 'PT-002', sublabel: 'Pressure Transmitter' },
  { value: 'tt-001', label: 'TT-001', sublabel: 'Temperature Transmitter' },
];

// openPanel() memindahkan fokus ke search box lewat requestAnimationFrame
// (lihat searchable-select.tsx) — async, jadi test yang mengandalkan fokus di
// search box harus menunggunya dulu sebelum mengirim keydown berikutnya,
// supaya event tidak "nyasar" ke elemen yang salah.
async function openAndGetSearchInput() {
  const searchInput = screen.getAllByRole('combobox')[1];
  await waitFor(() => expect(searchInput).toHaveFocus());
  return searchInput;
}

// Komponen ini sebelumnya (temuan audit UI/UX High) sama sekali tidak bisa
// dioperasikan tanpa mouse — test di bawah memverifikasi perbaikannya:
// trigger bisa dibuka dengan keyboard, panel dinavigasi dengan Arrow, dipilih
// dengan Enter, ditutup dengan Escape.
describe('SearchableSelect — keyboard accessibility', () => {
  it('membuka panel & fokus ke search box saat trigger ditekan Enter', async () => {
    const user = userEvent.setup();
    render(<SearchableSelect options={OPTIONS} value="" onChange={vi.fn()} />);

    // Trigger punya role="combobox" eksplisit (lihat komentar aksesibilitas di
    // komponen) — bukan role="button" implisit dari elemen <button>-nya.
    const trigger = screen.getAllByRole('combobox')[0];
    trigger.focus();
    await user.keyboard('{Enter}');

    expect(screen.getByRole('listbox')).toBeInTheDocument();
    // 2 elemen role="combobox": trigger (index 0) dan search input (index 1).
    // Fokus pindah lewat requestAnimationFrame di openPanel(), jadi async.
    await waitFor(() => expect(screen.getAllByRole('combobox')[1]).toHaveFocus());
  });

  it('membuka panel saat trigger ditekan ArrowDown (bukan cuma Enter/Space)', async () => {
    const user = userEvent.setup();
    render(<SearchableSelect options={OPTIONS} value="" onChange={vi.fn()} />);

    screen.getAllByRole('combobox')[0].focus();
    await user.keyboard('{ArrowDown}');

    expect(screen.getByRole('listbox')).toBeInTheDocument();
  });

  it('ArrowDown/ArrowUp memindahkan highlight, Enter memilih baris yang di-highlight', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<SearchableSelect options={OPTIONS} value="" onChange={onChange} />);

    await user.click(screen.getAllByRole('combobox')[0]);
    const searchInput = await openAndGetSearchInput();
    await user.type(searchInput, '{ArrowDown}'); // highlight index 0 (pt-001) -> 1 (pt-002)
    await user.type(searchInput, '{Enter}');

    expect(onChange).toHaveBeenCalledWith('pt-002');
  });

  it('Escape menutup panel dan mengembalikan fokus ke trigger', async () => {
    const user = userEvent.setup();
    render(<SearchableSelect options={OPTIONS} value="" onChange={vi.fn()} />);

    const trigger = screen.getAllByRole('combobox')[0];
    await user.click(trigger);
    expect(screen.getByRole('listbox')).toBeInTheDocument();
    const searchInput = await openAndGetSearchInput();

    await user.type(searchInput, '{Escape}');

    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });

  it('mengetik di search box memfilter daftar berdasarkan label/sublabel', async () => {
    const user = userEvent.setup();
    render(<SearchableSelect options={OPTIONS} value="" onChange={vi.fn()} />);

    await user.click(screen.getAllByRole('combobox')[0]);
    const searchInput = await openAndGetSearchInput();
    await user.type(searchInput, 'temperature');

    expect(screen.getByRole('option', { name: /TT-001/ })).toBeInTheDocument();
    expect(screen.queryByRole('option', { name: /PT-001/ })).not.toBeInTheDocument();
  });

  it('tombol "Hapus pilihan" tetap bisa diakses via keyboard (tabIndex bukan -1)', () => {
    render(<SearchableSelect options={OPTIONS} value="pt-001" onChange={vi.fn()} />);

    const clearButton = screen.getByRole('button', { name: 'Hapus pilihan' });
    expect(clearButton).not.toHaveAttribute('tabIndex', '-1');
  });
});
