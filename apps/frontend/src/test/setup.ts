import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

// Tanpa ini, DOM dari satu test "bocor" ke test berikutnya (elemen hasil
// render test A masih ada di document saat test B query by role/text).
afterEach(() => {
  cleanup();
});
