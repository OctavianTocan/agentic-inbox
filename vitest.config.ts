import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./apps/web/src', import.meta.url))
    }
  },
  test: {
    environment: 'jsdom',
    globals: false,
    include: [
      'apps/web/test/**/*.test.ts',
      'apps/web/test/**/*.test.tsx',
      'apps/api/test/**/*.test.ts',
      'packages/**/test/**/*.test.ts'
    ],
    setupFiles: ['apps/web/test/setup.ts'],
    testTimeout: 30_000
  }
});
