import { useEffect, useRef, useState } from 'react';
import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useDebouncedValue } from '@/lib/use-debounced-value';

interface Props {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  /** Jeda debounce dalam ms sebelum `onChange` dipanggil. Default 300ms. */
  debounceMs?: number;
}

/**
 * Sebelumnya `onChange` dipanggil langsung per keystroke — dipakai di 22 list
 * page sebagai `params.search`, yang trigger refetch TanStack Query tiap
 * karakter diketik (mis. ketik "transmitter" = 11 request berurutan).
 *
 * Debounce dipasang DI SINI (bukan di tiap pemanggil) supaya otomatis berlaku
 * ke semua pemakai `SearchInput` tanpa perlu ubah satu-satu. State lokal
 * (`draft`) dipakai supaya karakter yang diketik tetap tampil instan di input
 * — hanya pemanggilan `onChange` ke parent yang ditunda lewat `useDebouncedValue`.
 */
export function SearchInput({ value, onChange, placeholder = 'Cari...', debounceMs = 300 }: Props) {
  const [draft, setDraft] = useState(value);
  const debouncedDraft = useDebouncedValue(draft, debounceMs);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  // Sinkronkan draft kalau value berubah dari LUAR komponen ini (mis. tombol
  // "Reset Filter" di halaman list) — bukan dari debounce kita sendiri.
  useEffect(() => {
    setDraft(value);
  }, [value]);

  useEffect(() => {
    if (debouncedDraft !== value) {
      onChangeRef.current(debouncedDraft);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedDraft]);

  return (
    <div className="relative w-full sm:w-64">
      <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
      <Input
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        placeholder={placeholder}
        className="pl-8"
      />
    </div>
  );
}
