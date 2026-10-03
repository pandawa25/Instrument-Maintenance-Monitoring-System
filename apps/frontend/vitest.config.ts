import { defineConfig, mergeConfig } from 'vitest/config';
import viteConfig from './vite.config';

// File terpisah dari vite.config.ts (bukan digabung di sana) supaya vite.config.ts
// tetap murni config build/dev — tidak perlu import vitest/config di situ, yang
// tidak dibutuhkan sama sekali saat `vite build`/`vite dev` jalan.
export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      environment: 'jsdom',
      globals: true,
      setupFiles: ['./src/test/setup.ts'],
      css: false,
      coverage: {
        provider: 'v8',
        reporter: ['text', 'html'],
        exclude: ['node_modules/', 'src/test/', '**/*.d.ts', '**/*.config.*'],
      },
    },
  }),
);
