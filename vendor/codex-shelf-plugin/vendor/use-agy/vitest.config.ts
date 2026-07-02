import { existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

const repoRoot = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [
    {
      name: 'workspace-local-alias',
      enforce: 'pre',
      resolveId(source, importer) {
        if (!source.startsWith('@/') || importer === undefined) {
          return null;
        }

        const packageRoot = findWorkspacePackageRoot(importer);
        if (packageRoot === undefined) {
          return null;
        }

        const target = resolve(packageRoot, 'src', source.slice(2));
        const tsTarget = `${target}.ts`;
        if (existsSync(tsTarget)) {
          return tsTarget;
        }

        return existsSync(target) ? target : null;
      },
    },
  ],
  test: {
    include: ['apps/**/test/**/*.test.ts', 'packages/**/test/**/*.test.ts'],
    setupFiles: ['./vitest.setup.ts'],
    environment: 'node',
  },
});

/**
 * Finds the workspace package that owns a test or source importer.
 *
 * @param importer - Absolute importer path from Vite resolution.
 * @returns The package root when it has a source directory.
 */
function findWorkspacePackageRoot(importer: string): string | undefined {
  let current = dirname(importer);

  while (current.startsWith(repoRoot)) {
    if (
      existsSync(join(current, 'package.json')) &&
      existsSync(join(current, 'src'))
    ) {
      return current;
    }

    const parent = dirname(current);
    if (parent === current) {
      return undefined;
    }
    current = parent;
  }

  return undefined;
}
