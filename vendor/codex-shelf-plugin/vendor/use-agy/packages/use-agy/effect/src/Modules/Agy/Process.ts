import * as Context from 'effect/Context';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import { Path } from 'effect/Path';
import * as Stream from 'effect/Stream';
import { ChildProcess } from 'effect/unstable/process';
import { ChildProcessSpawner } from 'effect/unstable/process/ChildProcessSpawner';
import type { AgyProcessInput, AgyProcessOutput } from './Domain';
import { AgyProcessError } from './Errors';
import { resolveWorkspacePathsWithPath } from './Workspace';

/**
 * Runs raw AGY subprocess commands.
 *
 * @errors AgyProcessError
 */
export class AgyProcess extends Context.Service<
  AgyProcess,
  {
    /**
     * Executes AGY and returns collected stdout, stderr, and exit code.
     *
     * @param input - AGY process mode and command options.
     * @returns Captured process output.
     * @errors AgyProcessError
     */
    readonly run: (
      input: AgyProcessInput
    ) => Effect.Effect<AgyProcessOutput, AgyProcessError>;
  }
>()('@use-agy/effect/AgyProcess') {}

/**
 * Builds AGY command arguments using flags from `agy --help`.
 *
 * @param input - AGY process mode and command options.
 * @returns Command arguments for the `agy` binary.
 */
export function buildAgyArgs(input: AgyProcessInput): ReadonlyArray<string> {
  if (input.mode === 'status') {
    return ['--version'];
  }

  return [
    ...optionArg('--model', input.model),
    ...optionArg('--sandbox', input.sandbox),
    ...repeatableArg('--add-dir', input.addDirs ?? []),
    ...optionArg('--print-timeout', input.timeout),
    '--print',
    input.prompt,
  ];
}

/** Provides the live AGY child-process adapter. */
export const layer = Layer.effect(
  AgyProcess,
  Effect.gen(function* () {
    const path = yield* Path;
    const spawner = yield* ChildProcessSpawner;

    const run = Effect.fn('AgyProcess.run')(function* (input: AgyProcessInput) {
      const workspace = resolveWorkspacePathsWithPath(input, path);
      const command = ChildProcess.make('agy', buildAgyArgs(input), {
        cwd: workspace.cwd,
        extendEnv: true,
      });

      return yield* Effect.scoped(
        Effect.gen(function* () {
          const handle = yield* spawner.spawn(command);
          const result = yield* Effect.all(
            {
              stdout: Stream.mkString(Stream.decodeText(handle.stdout)),
              stderr: Stream.mkString(Stream.decodeText(handle.stderr)),
              exitCode: handle.exitCode,
            },
            { concurrency: 'unbounded' }
          );

          return {
            stdout: result.stdout,
            stderr: result.stderr,
            exitCode: result.exitCode,
          };
        })
      ).pipe(Effect.mapError((cause) => new AgyProcessError({ cause })));
    });

    return { run };
  })
);

/**
 * Creates a flag/value argument pair when the value is present.
 *
 * @param flag - CLI flag name.
 * @param value - Optional flag value.
 * @returns Empty array or flag/value pair.
 */
function optionArg(
  flag: string,
  value: string | undefined
): ReadonlyArray<string> {
  return value === undefined ? [] : [flag, value];
}

/**
 * Creates repeated flag/value pairs for repeatable AGY options.
 *
 * @param flag - CLI flag name.
 * @param values - Values to repeat after the flag.
 * @returns Flattened repeatable argument pairs.
 */
function repeatableArg(
  flag: string,
  values: ReadonlyArray<string>
): ReadonlyArray<string> {
  return values.flatMap((value) => [flag, value]);
}

//<skill-gen>
// ---
// name: use-agy
// description: "Use AGY through the shared Effect service, Bun CLI, and local API/RPC runtime."
// ---
//
// ## Process Adapter
//
// - `Process.ts` is the only module that should build raw `agy` subprocess
//   arguments.
// - Current AGY run mode uses `--print`, optional `--model`, optional
//   `--sandbox`, repeatable `--add-dir`, and optional `--print-timeout`.
// - Status checks use `agy --version` as a cheap availability probe.
// - The process adapter always captures `stdout`, `stderr`, and `exitCode` for
//   callers.
// - Keep workspace path resolution and additional directory validation here or
//   in `Workspace.ts`, not in CLI/API callers.
// - Prefer Effect v4 process primitives from `effect/unstable/process` with
//   Bun platform services.
//</skill-gen>
