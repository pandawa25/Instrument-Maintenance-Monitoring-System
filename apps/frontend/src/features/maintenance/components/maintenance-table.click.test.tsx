import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { MaintenanceTable } from './maintenance-table';
import type { Maintenance } from '../types/maintenance.types';

const item = {
  id: 'cm-1', maintenanceDate: '2026-10-12', failureCategory: 'INSTRUMENT', problemDescription: 'Control valve macet',
  status: 'OPEN', priority: 'HIGH', equipment: { id: 'e', tagNumber: 'FV-101', service: 'Feed' }, area: { areaCode: 'AR-01', areaName: 'A' },
  technician: { id: 't', fullName: 'Budi' },
} as unknown as Maintenance;

function renderTable(props: Partial<Parameters<typeof MaintenanceTable>[0]> = {}) {
  const onView = vi.fn(), onEdit = vi.fn(), onDelete = vi.fn(), onSort = vi.fn();
  render(
    <MemoryRouter>
      <MaintenanceTable
        items={[item]}
        isLoading={false}
        canEdit
        onSort={onSort}
        onEdit={onEdit}
        onDelete={onDelete}
        onView={onView}
        {...props}
      />
    </MemoryRouter>,
  );
  return { onView, onEdit, onDelete, onSort };
}

describe('MaintenanceTable — baris bisa diklik', () => {
  it('klik baris membuka detail, klik tombol Edit/Delete tidak', async () => {
    const { onView, onEdit, onDelete } = renderTable();

    await userEvent.click(screen.getByText('Control valve macet'));
    expect(onView).toHaveBeenCalledWith(item);

    await userEvent.click(screen.getByRole('button', { name: 'Edit' }));
    await userEvent.click(screen.getByRole('button', { name: 'Delete' }));
    expect(onView).toHaveBeenCalledTimes(1);
    expect(onEdit).toHaveBeenCalledTimes(1);
    expect(onDelete).toHaveBeenCalledTimes(1);
  });

  it('klik Tag Number menuju History Maintenance equipment tsb, bukan buka detail CM', async () => {
    const { onView } = renderTable();

    const tagLink = screen.getByRole('link', { name: 'FV-101' });
    expect(tagLink).toHaveAttribute('href', '/maintenance-history?equipmentId=e');

    await userEvent.click(tagLink);
    expect(onView).not.toHaveBeenCalled();
  });
});
