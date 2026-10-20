import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DocumentsSection } from './documents-section';
import type { Attachment } from '../types/attachment.types';

const fetchMock = vi.fn();
const uploadMock = vi.fn();
const deleteMock = vi.fn();
vi.mock('../api/attachments.api', () => ({
  fetchAttachments: (...a: unknown[]) => fetchMock(...a),
  uploadAttachment: (...a: unknown[]) => uploadMock(...a),
  deleteAttachment: (...a: unknown[]) => deleteMock(...a),
  fetchAttachmentBlob: vi.fn().mockResolvedValue(new Blob(['x'])),
}));

const att = (id: string, fileName: string, mimeType: string): Attachment => ({
  id, entityType: 'EQUIPMENT', entityId: 'eq-1', fileName, mimeType, fileSize: 2048,
  uploadedBy: { id: 'u', fullName: 'Budi' }, createdAt: '2026-10-20T03:00:00Z', url: `/attachments/${id}/file`,
});

function renderSection(canEdit: boolean) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={client}>
      <DocumentsSection entityType="EQUIPMENT" entityId="eq-1" canEdit={canEdit} />
    </QueryClientProvider>,
  );
}

describe('DocumentsSection (Equipment)', () => {
  beforeEach(() => {
    fetchMock.mockReset();
    uploadMock.mockReset();
    deleteMock.mockReset();
    globalThis.URL.createObjectURL = vi.fn(() => 'blob:x');
    globalThis.URL.revokeObjectURL = vi.fn();
  });

  it('memisahkan Foto dan Dokumen/Datasheet', async () => {
    fetchMock.mockResolvedValue([att('1', 'lapangan.jpg', 'image/jpeg'), att('2', 'datasheet-3051.pdf', 'application/pdf')]);
    renderSection(false);
    expect(await screen.findByText(/Foto \(1\)/)).toBeInTheDocument();
    expect(screen.getByText(/Dokumen \/ Datasheet \(1\)/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'datasheet-3051.pdf' })).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith('EQUIPMENT', 'eq-1');
  });

  it('tanpa hak edit: tidak ada tombol upload maupun hapus, unduh tetap ada', async () => {
    fetchMock.mockResolvedValue([att('2', 'datasheet.pdf', 'application/pdf')]);
    renderSection(false);
    await screen.findByRole('button', { name: 'datasheet.pdf' });
    expect(screen.queryByRole('button', { name: /upload/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /hapus/i })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /unduh datasheet.pdf/i })).toBeInTheDocument();
  });

  it('upload beberapa file: yang valid diunggah, yang salah tipe/terlalu besar dilaporkan tanpa membatalkan lainnya', async () => {
    fetchMock.mockResolvedValue([]);
    uploadMock.mockResolvedValue(att('9', 'a.pdf', 'application/pdf'));
    renderSection(true);
    await screen.findByText(/belum ada foto atau dokumen/i);

    const good = new File(['x'], 'datasheet.pdf', { type: 'application/pdf' });
    const photo = new File(['x'], 'foto.png', { type: 'image/png' });
    const bad = new File(['x'], 'macro.xlsm', { type: 'application/vnd.ms-excel' });
    const huge = new File(['x'], 'besar.pdf', { type: 'application/pdf' });
    Object.defineProperty(huge, 'size', { value: 11 * 1024 * 1024 });

    await userEvent.upload(screen.getByLabelText(/pilih file foto atau dokumen/i), [good, bad, huge, photo], { applyAccept: false });

    await waitFor(() => expect(uploadMock).toHaveBeenCalledTimes(2));
    expect(uploadMock).toHaveBeenNthCalledWith(1, 'EQUIPMENT', 'eq-1', good);
    expect(uploadMock).toHaveBeenNthCalledWith(2, 'EQUIPMENT', 'eq-1', photo);
    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('macro.xlsm: tipe file tidak didukung');
    expect(alert).toHaveTextContent('besar.pdf: ukuran melebihi 10MB');
  });

  it('error server saat upload ditampilkan per file', async () => {
    fetchMock.mockResolvedValue([]);
    uploadMock.mockRejectedValue({ response: { data: { message: 'Maksimal 20 lampiran per data' } } });
    renderSection(true);
    await screen.findByText(/belum ada foto atau dokumen/i);
    await userEvent.upload(screen.getByLabelText(/pilih file foto atau dokumen/i), new File(['x'], 'a.pdf', { type: 'application/pdf' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('a.pdf: Maksimal 20 lampiran per data');
  });

  it('hapus dokumen memanggil API delete', async () => {
    fetchMock.mockResolvedValue([att('2', 'datasheet.pdf', 'application/pdf')]);
    deleteMock.mockResolvedValue(undefined);
    renderSection(true);
    await userEvent.click(await screen.findByRole('button', { name: /hapus datasheet.pdf/i }));
    await waitFor(() => expect(deleteMock).toHaveBeenCalledWith('2'));
  });
});
