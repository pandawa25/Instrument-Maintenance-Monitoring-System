import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const updateAsync = vi.fn().mockResolvedValue({});
const createAsync = vi.fn().mockResolvedValue({});
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock('../hooks/use-maintenance', () => ({
  useCreateMaintenance: () => ({ mutateAsync: createAsync, isPending: false }),
  useUpdateMaintenance: () => ({ mutateAsync: updateAsync, isPending: false }),
}));
vi.mock('../hooks/use-maintenance-lookups', () => ({
  useEquipmentLookup: () => ({ data: [] }),
  useTechniciansLookup: () => ({ data: [] }),
  useSparePartsLookupForMaintenance: () => ({ data: [] }),
}));

import { MaintenanceForm } from './maintenance-form';
import type { Maintenance } from '../types/maintenance.types';

const existing = {
  id: 'cm-1', spkNumber: 'ESPK-1', maintenanceDate: '2026-10-01T00:00:00.000Z',
  equipment: { id: 'e1', tagNumber: 'CV-1', service: 'x' }, area: { id: 'a', areaCode: 'A', areaName: 'A' },
  failureCategory: 'MECHANICAL', failureMode: 'DRIFT', problemDescription: 'Valve macet', rootCause: null, actionTaken: null,
  downtimeHours: null, technician: { id: 't1', fullName: 'T' }, additionalTechnicians: [], priority: 'MEDIUM',
  status: 'OPEN', completionDate: null, createdBy: { id: 't1', fullName: 'T' }, remarks: null, needsSparePart: false,
  materials: [], notificationNumber: null, notificationDate: null, notificationStatus: null, workOrderNumber: null,
  workOrderDate: null, workOrderStatus: null, createdAt: '', updatedAt: '',
} as unknown as Maintenance;

describe('MaintenanceForm — Failure Category & Failure Mode', () => {
  beforeEach(() => {
    updateAsync.mockClear();
    createAsync.mockClear();
  });

  it('form baru: Failure Category TIDAK terisi default dan wajib dipilih; Failure Mode opsional', () => {
    render(<MaintenanceForm onSuccess={() => {}} onCancel={() => {}} />);
    const category = screen.getByLabelText('Failure Category') as HTMLSelectElement;
    expect(category.value).toBe('');
    expect(category).toBeRequired();
    expect((screen.getByLabelText(/Failure Mode/) as HTMLSelectElement).value).toBe('');
    expect(screen.getByLabelText(/Failure Mode/)).not.toBeRequired();
  });

  it('memilih kategori menampilkan teks bantuan kategori itu; pilihan baru tersedia', async () => {
    const user = userEvent.setup();
    render(<MaintenanceForm onSuccess={() => {}} onCancel={() => {}} />);
    const category = screen.getByLabelText('Failure Category');
    expect(screen.getByTestId('failure-category-hint')).toHaveTextContent(/belum jelas/i);

    await user.selectOptions(category, 'UTILITY');
    expect(screen.getByTestId('failure-category-hint')).toHaveTextContent(/instrument air/i);
    expect(screen.getByRole('option', { name: 'Control System (DCS/PLC/SIS)' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Other / Unknown' })).toBeInTheDocument();
  });

  it('edit: mengosongkan Failure Mode mengirim null (menghapus nilai lama)', async () => {
    const user = userEvent.setup();
    render(<MaintenanceForm maintenance={existing} onSuccess={() => {}} onCancel={() => {}} />);
    await waitFor(() => expect((screen.getByLabelText(/Failure Mode/) as HTMLSelectElement).value).toBe('DRIFT'));

    await user.selectOptions(screen.getByLabelText(/Failure Mode/), '');
    // fireEvent.submit: lookup dropdown (equipment/technician) sengaja kosong di test ini, jadi validasi
    // native `required` jsdom akan menahan klik tombol — yang diuji di sini hanya isi payload.
    fireEvent.submit(screen.getByRole('button', { name: /simpan/i }).closest('form') as HTMLFormElement);

    await waitFor(() => expect(updateAsync).toHaveBeenCalled());
    expect(updateAsync.mock.calls[0][0].payload).toMatchObject({ failureCategory: 'MECHANICAL', failureMode: null });
  });

  it('edit tanpa mengubah Failure Mode mengirim nilai yang sama', async () => {
    render(<MaintenanceForm maintenance={existing} onSuccess={() => {}} onCancel={() => {}} />);
    await waitFor(() => expect((screen.getByLabelText(/Failure Mode/) as HTMLSelectElement).value).toBe('DRIFT'));
    // fireEvent.submit: lookup dropdown (equipment/technician) sengaja kosong di test ini, jadi validasi
    // native `required` jsdom akan menahan klik tombol — yang diuji di sini hanya isi payload.
    fireEvent.submit(screen.getByRole('button', { name: /simpan/i }).closest('form') as HTMLFormElement);
    await waitFor(() => expect(updateAsync).toHaveBeenCalled());
    expect(updateAsync.mock.calls[0][0].payload.failureMode).toBe('DRIFT');
  });
});
