import * as BunPath from '@effect/platform-bun/BunPath';
import { it } from '@effect/vitest';
import * as Effect from 'effect/Effect';
import { describe, expect } from 'vitest';
import { resolveWorkspacePaths } from '@/Modules/Agy/Workspace';

describe('Agy Workspace', () => {
  it.effect('resolves add-dir values relative to cwd', () =>
    Effect.gen(function* () {
      const paths = yield* resolveWorkspacePaths({
        cwd: '/tmp/project',
        addDirs: ['../shared', '/opt/cache'],
      });

      expect(paths).toEqual({
        cwd: '/tmp/project',
        addDirs: ['/tmp/shared', '/opt/cache'],
      });
    }).pipe(Effect.provide(BunPath.layer))
  );
});
