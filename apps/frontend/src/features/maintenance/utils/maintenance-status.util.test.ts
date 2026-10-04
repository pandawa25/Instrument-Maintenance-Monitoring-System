import { describe, expect, it } from 'vitest';
import { getSelectableStatuses, MAINTENANCE_STATUS_LABELS } from './maintenance-status.util';

describe('getSelectableStatuses', () => {
  it('selalu menyertakan status saat ini di urutan pertama', () => {
    expect(getSelectableStatuses('IN_PROGRESS')[0]).toBe('IN_PROGRESS');
  });

  it('OPEN -> [OPEN, IN_PROGRESS, WAITING_MATERIAL, COMPLETED, CANCELLED]', () => {
    expect(getSelectableStatuses('OPEN')).toEqual([
      'OPEN',
      'IN_PROGRESS',
      'WAITING_MATERIAL',
      'COMPLETED',
      'CANCELLED',
    ]);
  });

  it('IN_PROGRESS -> [IN_PROGRESS, WAITING_MATERIAL, COMPLETED, CANCELLED]', () => {
    expect(getSelectableStatuses('IN_PROGRESS')).toEqual([
      'IN_PROGRESS',
      'WAITING_MATERIAL',
      'COMPLETED',
      'CANCELLED',
    ]);
  });

  it('WAITING_MATERIAL -> [WAITING_MATERIAL, IN_PROGRESS, CANCELLED]', () => {
    expect(getSelectableStatuses('WAITING_MATERIAL')).toEqual(['WAITING_MATERIAL', 'IN_PROGRESS', 'CANCELLED']);
  });

  it('status terminal (COMPLETED/CANCELLED) hanya mengembalikan dirinya sendiri — konsisten dengan backend', () => {
    expect(getSelectableStatuses('COMPLETED')).toEqual(['COMPLETED']);
    expect(getSelectableStatuses('CANCELLED')).toEqual(['CANCELLED']);
  });

  it('hasil tidak pernah mengandung duplikat', () => {
    for (const status of Object.keys(MAINTENANCE_STATUS_LABELS) as (keyof typeof MAINTENANCE_STATUS_LABELS)[]) {
      const selectable = getSelectableStatuses(status);
      expect(new Set(selectable).size).toBe(selectable.length);
    }
  });
});

describe('MAINTENANCE_STATUS_LABELS', () => {
  it('punya label untuk semua 5 status', () => {
    expect(Object.keys(MAINTENANCE_STATUS_LABELS).sort()).toEqual(
      ['OPEN', 'IN_PROGRESS', 'WAITING_MATERIAL', 'COMPLETED', 'CANCELLED'].sort(),
    );
  });
});
