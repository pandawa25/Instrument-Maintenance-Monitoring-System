import { BadRequestException } from '@nestjs/common';
import { MaintenanceStatus } from '@prisma/client';
import { validateCompletionDateRequirement, validateStatusTransition } from './maintenance-status.util';

const ALL_STATUSES: MaintenanceStatus[] = ['OPEN', 'IN_PROGRESS', 'WAITING_MATERIAL', 'COMPLETED', 'CANCELLED'];

// Transisi yang valid, dibaca langsung dari definisi ALLOWED_TRANSITIONS di
// maintenance-status.util.ts — kalau map itu berubah tanpa sengaja, test ini
// yang akan gagal duluan (bukan ditemukan user lewat UI).
const VALID_TRANSITIONS: [MaintenanceStatus, MaintenanceStatus][] = [
  ['OPEN', 'IN_PROGRESS'],
  ['OPEN', 'WAITING_MATERIAL'],
  ['OPEN', 'CANCELLED'],
  ['IN_PROGRESS', 'WAITING_MATERIAL'],
  ['IN_PROGRESS', 'COMPLETED'],
  ['IN_PROGRESS', 'CANCELLED'],
  ['WAITING_MATERIAL', 'IN_PROGRESS'],
  ['WAITING_MATERIAL', 'CANCELLED'],
];

describe('validateStatusTransition', () => {
  it.each(VALID_TRANSITIONS)('mengizinkan transisi %s -> %s', (from, to) => {
    expect(() => validateStatusTransition(from, to)).not.toThrow();
  });

  it.each(ALL_STATUSES)('no-op (tidak throw) kalau status tidak berubah (%s -> %s yang sama)', (status) => {
    expect(() => validateStatusTransition(status, status)).not.toThrow();
  });

  // Semua pasangan (from, to) yang BUKAN di VALID_TRANSITIONS dan BUKAN no-op
  // harus ditolak — termasuk status terminal (COMPLETED/CANCELLED) yang sama
  // sekali tidak boleh keluar dari statusnya.
  const invalidPairs: [MaintenanceStatus, MaintenanceStatus][] = [];
  for (const from of ALL_STATUSES) {
    for (const to of ALL_STATUSES) {
      if (from === to) continue;
      const isValid = VALID_TRANSITIONS.some(([f, t]) => f === from && t === to);
      if (!isValid) invalidPairs.push([from, to]);
    }
  }

  it.each(invalidPairs)('menolak transisi %s -> %s', (from, to) => {
    expect(() => validateStatusTransition(from, to)).toThrow(BadRequestException);
  });

  it('pesan error untuk status terminal (COMPLETED) menyebut "status akhir", bukan daftar transisi valid', () => {
    expect(() => validateStatusTransition('COMPLETED', 'OPEN')).toThrow(/status akhir/);
  });

  it('pesan error untuk status non-terminal menyebutkan daftar transisi yang valid', () => {
    expect(() => validateStatusTransition('OPEN', 'COMPLETED')).toThrow(/IN_PROGRESS, WAITING_MATERIAL, CANCELLED/);
  });
});

describe('validateCompletionDateRequirement', () => {
  it('menolak status COMPLETED tanpa completionDate (null)', () => {
    expect(() => validateCompletionDateRequirement('COMPLETED', null)).toThrow(BadRequestException);
  });

  it('menolak status COMPLETED tanpa completionDate (undefined)', () => {
    expect(() => validateCompletionDateRequirement('COMPLETED', undefined)).toThrow(BadRequestException);
  });

  it('menerima status COMPLETED dengan completionDate berupa Date', () => {
    expect(() => validateCompletionDateRequirement('COMPLETED', new Date())).not.toThrow();
  });

  it('menerima status COMPLETED dengan completionDate berupa string ISO', () => {
    expect(() => validateCompletionDateRequirement('COMPLETED', '2026-10-03T00:00:00.000Z')).not.toThrow();
  });

  it.each<MaintenanceStatus>(['OPEN', 'IN_PROGRESS', 'WAITING_MATERIAL', 'CANCELLED'])(
    'tidak mewajibkan completionDate untuk status %s',
    (status) => {
      expect(() => validateCompletionDateRequirement(status, null)).not.toThrow();
    },
  );
});
