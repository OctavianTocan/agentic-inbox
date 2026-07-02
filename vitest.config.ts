import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

const webSrc = fileURLToPath(new URL('./apps/web/src', import.meta.url));
const apiSrc = fileURLToPath(new URL('./apps/api/src', import.meta.url));

export default defineConfig({
  test: {
    testTimeout: 30_000,
    projects: [
      {
        resolve: { alias: { '@': webSrc } },
        test: {
          name: 'web',
          environment: 'jsdom',
          globals: false,
          include: [
            'apps/web/test/**/*.test.ts',
            'apps/web/test/**/*.test.tsx',
            'packages/**/test/**/*.test.ts'
          ],
          setupFiles: ['apps/web/test/setup.ts']
        }
      },
      {
        resolve: { alias: { '@': apiSrc } },
        test: {
          name: 'api',
          environment: 'node',
          globals: false,
          include: ['apps/api/test/**/*.test.ts'],
          // All DB suites share one Postgres and truncate between tests, so
          // they must run serially or a truncate wipes another file's rows.
          fileParallelism: false,
          sequence: { concurrent: false }
        }
      }
    ]
  }
});
