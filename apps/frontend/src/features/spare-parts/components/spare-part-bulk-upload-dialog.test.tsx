import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SparePartBulkUploadDialog } from './spare-part-bulk-upload-dialog';
import type { BulkUploadPreview } from '../types/spare-part.types';

const previewMock = vi.fn();
const commitMock = vi.fn();
vi.mock('../api/spare-parts.api', () => ({
  previewSparePartBulk: (...a: unknown[]) => previewMock(...a),
  commitSparePartBulk: (...a: unknown[]) => commitMock(...a),
  downloadSparePartBulkTemplate: vi.fn(),
}));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const PREVIEW_OK: BulkUploadPreview = {
  mode: 'CREATE_ONLY', filename: 'sp.xlsx', totalRows: 2, okRows: 2, warningRows: 0, errorRows: 0,
  createRows: 2, updateRows: 0, noChangeRows: 0, canCommit: true,
  rows: [
    { rowNumber: 2, severity: 'OK', action: 'CREATE', messages: [], raw: { kimap: 'KM-1', name: 'Seal' } },
    { rowNumber: 3, severity: 'OK', action: 'CREATE', messages: [], raw: { kimap: 'KM-2', name: 'Gasket' } },
  ],
};
const PREVIEW_ERR: BulkUploadPreview = {
  ...PREVIEW_OK, okRows: 1, errorRows: 1, createRows: 1, canCommit: false,
  rows: [
    PREVIEW_OK.rows[0],
    { rowNumber: 3, severity: 'ERROR', action: 'CREATE', messages: ["KIMAP 'KM-2' sudah terdaftar"], raw: { kimap: 'KM-2' } },
  ],
};

function renderDialog() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  render(
    <QueryClientProvider client={client}>
      <SparePartBulkUploadDialog open onOpenChange={() => {}} />
    </QueryClientProvider>,
  );
}

const FILE = new File(['x'], 'sp.xlsx', { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });

describe('SparePartBulkUploadDialog', () => {
  beforeEach(() => {
    previewMock.mockReset();
    commitMock.mockReset();
  });

  it('tombol Upload & Preview nonaktif sampai file dipilih', () => {
    renderDialog();
    expect(screen.getByRole('button', { name: /upload & preview/i })).toBeDisabled();
  });

  it('preview OK -> simpan mengirim FILE YANG SAMA dan MODE yang sama -> layar sukses', async () => {
    previewMock.mockResolvedValue(PREVIEW_OK);
    commitMock.mockResolvedValue({ createdCount: 2, updatedCount: 0, skippedCount: 0 });
    const user = userEvent.setup();
    renderDialog();

    await user.click(screen.getByRole('button', { name: /tambah & update/i }));
    await user.upload(screen.getByLabelText(/file excel spare part/i), FILE);
    await user.click(screen.getByRole('button', { name: /upload & preview/i }));

    expect(previewMock).toHaveBeenCalledWith(FILE, 'UPDATE_OR_CREATE');
    await user.click(await screen.findByRole('button', { name: /simpan 2 baris/i }));
    await waitFor(() => expect(commitMock).toHaveBeenCalledWith(FILE, 'UPDATE_OR_CREATE'));
    expect(await screen.findByText(/2 spare part baru dibuat/i)).toBeInTheDocument();
  });

  it('ada baris ERROR -> tombol simpan nonaktif dan pesan error tampil', async () => {
    previewMock.mockResolvedValue(PREVIEW_ERR);
    const user = userEvent.setup();
    renderDialog();
    await user.upload(screen.getByLabelText(/file excel spare part/i), FILE);
    await user.click(screen.getByRole('button', { name: /upload & preview/i }));

    expect(await screen.findByText(/sudah terdaftar/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /simpan 1 baris/i })).toBeDisabled();
    expect(commitMock).not.toHaveBeenCalled();
  });

  it('error dari server saat preview ditampilkan', async () => {
    previewMock.mockRejectedValue({ response: { data: { message: 'File bukan format Excel (.xlsx) yang valid' } } });
    const user = userEvent.setup();
    renderDialog();
    await user.upload(screen.getByLabelText(/file excel spare part/i), FILE);
    await user.click(screen.getByRole('button', { name: /upload & preview/i }));
    expect(await screen.findByText(/bukan format excel/i)).toBeInTheDocument();
  });
});
