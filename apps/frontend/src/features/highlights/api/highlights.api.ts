import { api } from '@/lib/axios';
import type { HighlightItem } from '../types/highlight.types';

export async function fetchHighlights() {
  const { data } = await api.get<{ data: HighlightItem[] }>('/highlights');
  return data.data;
}
