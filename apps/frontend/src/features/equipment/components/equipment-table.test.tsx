import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { EquipmentTable } from './equipment-table';
import type { Equipment } from '../types/equipment.types';

const item = {
  id: 'eq-1', tagNumber: 'PT-101', service: 'Suction', status: 'ACTIVE', type: null,
  instrumentName: { id: 'i', code: 'PT', name: 'Pressure Transmitter' }, lrv: null, urv: null, unit: null,
  lastMaintenanceDate: null,
} as unknown as Equipment;

function setup(canEdit = true) {
  const handlers = { onEdit: vi.fn(), onDelete: vi.fn(), onView: vi.fn(), onToggleOne: vi.fn(), onToggleAll: vi.fn() };
  render(<EquipmentTable equipment={[item]} isLoading={false} canEdit={canEdit} selectedIds={new Set()} {...handlers} />);
  return handlers;
}

describe('EquipmentTable — baris bisa diklik', () => {
  it('klik di sel mana pun pada baris membuka detail', async () => {
    const h = setup();
    await userEvent.click(screen.getByText('Suction'));
    expect(h.onView).toHaveBeenCalledTimes(1);
    expect(h.onView).toHaveBeenCalledWith(item);
  });

  it('Tag Number adalah tombol (bisa lewat keyboard) dan hanya memicu SATU kali buka', async () => {
    const h = setup();
    const tag = screen.getByRole('button', { name: 'PT-101' });
    tag.focus();
    await userEvent.keyboard('{Enter}');
    expect(h.onView).toHaveBeenCalledTimes(1);
    await userEvent.click(tag);
    expect(h.onView).toHaveBeenCalledTimes(2); // satu klik = satu panggilan, bukan dua (tanpa bubbling ganda)
  });

  it('klik checkbox / Edit / Delete TIDAK ikut membuka detail', async () => {
    const h = setup();
    await userEvent.click(screen.getByRole('checkbox', { name: /pilih equipment pt-101/i }));
    await userEvent.click(screen.getByRole('button', { name: 'Edit' }));
    await userEvent.click(screen.getByRole('button', { name: 'Delete' }));
    expect(h.onToggleOne).toHaveBeenCalledWith('eq-1');
    expect(h.onEdit).toHaveBeenCalledTimes(1);
    expect(h.onDelete).toHaveBeenCalledTimes(1);
    expect(h.onView).not.toHaveBeenCalled();
  });

  it('role tanpa hak edit tetap bisa membuka detail lewat klik baris', async () => {
    const h = setup(false);
    await userEvent.click(screen.getByText('Pressure Transmitter'));
    expect(h.onView).toHaveBeenCalledWith(item);
  });
});

describe('EquipmentTable — kolom Range / Size untuk valve', () => {
  function renderValve(instrumentName: { id: string; code: string; name: string }) {
    const valve = {
      ...item, id: 'eq-2', tagNumber: 'XV-1', instrumentName, size: '4"', rating: 'ANSI 300', failAction: 'CLOSE',
    } as unknown as Equipment;
    render(
      <EquipmentTable
        equipment={[valve]}
        isLoading={false}
        canEdit
        selectedIds={new Set()}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onView={vi.fn()}
        onToggleOne={vi.fn()}
        onToggleAll={vi.fn()}
      />,
    );
  }

  it('valve dengan kode di luar CV/SV/KV/UV tetap menampilkan Size · Rating (deteksi via nama)', () => {
    renderValve({ id: 'i', code: 'PSV', name: 'Safety Valve' });
    expect(screen.getByText('4" · ANSI 300')).toBeInTheDocument();
  });

  it('nama tak dikenali tapi data size terisi → tetap tampil', () => {
    renderValve({ id: 'i', code: 'ZZ', name: 'Lainnya' });
    expect(screen.getByText('4" · ANSI 300')).toBeInTheDocument();
  });
});
