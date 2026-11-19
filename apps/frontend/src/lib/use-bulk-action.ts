import { useCallback, useState } from 'react';
import { toast } from 'sonner';

interface UseBulkActionOptions {
  /** Operasi per-item (biasanya `mutateAsync` dari mutation TanStack Query yang sudah ada). */
  action: (id: string) => Promise<unknown>;
  successMessage: (count: number) => string;
  /** Dipanggil saat ada kegagalan (sebagian atau seluruhnya). */
  failureMessage: (succeeded: number, failed: number) => string;
}

/**
 * Runner generik untuk aksi massal (bulk delete, bulk ubah status, dst) atas banyak id.
 *
 * Dijalankan paralel via Promise.allSettled — pola yang sama dipakai "Isi Massal" PM
 * Execution (lihat docs/roadmap.md Risk #11: N request paralel, bukan satu endpoint bulk
 * khusus di backend). Dipilih lagi di sini karena endpoint DELETE/PATCH yang ada per-item
 * sudah mengembalikan error spesifik per item (misal 409 Conflict "masih dipakai equipment
 * aktif") — justru harus diproses satu-satu supaya kegagalan sebagian tetap bisa dilaporkan
 * dengan jelas ke user, bukan all-or-nothing.
 */
export function useBulkAction({ action, successMessage, failureMessage }: UseBulkActionOptions) {
  const [isRunning, setIsRunning] = useState(false);

  const run = useCallback(
    async (ids: string[]) => {
      setIsRunning(true);
      const results = await Promise.allSettled(ids.map((id) => action(id)));
      setIsRunning(false);

      const succeeded = results.filter((r) => r.status === 'fulfilled').length;
      const failed = results.length - succeeded;

      if (failed === 0) {
        toast.success(successMessage(succeeded));
      } else {
        toast.error(failureMessage(succeeded, failed));
      }

      return { succeeded, failed };
    },
    [action, successMessage, failureMessage],
  );

  return { run, isRunning };
}
