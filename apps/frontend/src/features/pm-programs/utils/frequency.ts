import type { PmFrequencyUnit } from '../types/pm-program.types';

/** Tambahkan 1 interval frekuensi ke sebuah tanggal (untuk usulan tanggal periode berikutnya). */
export function addFrequencyInterval(date: Date, value: number, unit: PmFrequencyUnit): Date {
  const result = new Date(date);
  switch (unit) {
    case 'DAY':
      result.setDate(result.getDate() + value);
      break;
    case 'WEEK':
      result.setDate(result.getDate() + value * 7);
      break;
    case 'MONTH':
      result.setMonth(result.getMonth() + value);
      break;
    case 'YEAR':
      result.setFullYear(result.getFullYear() + value);
      break;
  }
  return result;
}

export function toDateInputValue(date: Date): string {
  return date.toISOString().slice(0, 10);
}
