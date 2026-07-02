import * as Effect from 'effect/Effect';
import { Path, type Path as PathService } from 'effect/Path';

export interface WorkspacePathsInput {
  readonly cwd?: string | undefined;
  readonly addDirs?: ReadonlyArray<string> | undefined;
}

export interface WorkspacePaths {
  readonly cwd: string;
  readonly addDirs: ReadonlyArray<string>;
}

/**
 * Resolves AGY workspace paths against either the provided cwd or process cwd.
 *
 * @param input - Optional working directory and additional workspace dirs.
 * @returns Absolute cwd and add-dir paths.
 */
export function resolveWorkspacePaths(
  input: WorkspacePathsInput
): Effect.Effect<WorkspacePaths, never, Path> {
  return Effect.gen(function* () {
    const path = yield* Path;
    return resolveWorkspacePathsWithPath(input, path);
  });
}

/**
 * Resolves AGY workspace paths with an already-captured path service.
 *
 * @param input - Optional working directory and additional workspace dirs.
 * @param path - Platform path service.
 * @returns Absolute cwd and add-dir paths.
 */
export function resolveWorkspacePathsWithPath(
  input: WorkspacePathsInput,
  path: PathService
): WorkspacePaths {
  const base = input.cwd ?? globalThis.process.cwd();
  const cwd = path.isAbsolute(base) ? base : path.resolve(base);
  const addDirs = (input.addDirs ?? []).map((dir) =>
    path.isAbsolute(dir) ? dir : path.resolve(cwd, dir)
  );

  return { cwd, addDirs };
}
