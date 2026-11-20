import { useQuery } from '@tanstack/react-query';
import { fetchHighlights } from '../api/highlights.api';

// staleTime pendek: daftar ini sering berubah (toggle bintang / auto-unhighlight saat
// status Done) dan dicek dari banyak tempat (3 modul lain invalidate queryKey ini juga,
// lihat useSetMaintenanceHighlighted dkk) — bukan data referensi yang jarang berubah.
export function useHighlights() {
  return useQuery({
    queryKey: ['highlights'],
    queryFn: fetchHighlights,
    staleTime: 30_000,
  });
}
