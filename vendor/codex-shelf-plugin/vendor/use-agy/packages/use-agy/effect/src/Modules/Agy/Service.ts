import * as BunServices from '@effect/platform-bun/BunServices';
import * as Context from 'effect/Context';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import type {
  AgyJsonResult,
  AgyRunInput,
  AgyStatus,
  AgyTextResult,
} from './Domain';
import { type AgyError, AgyExitError, AgyJsonError } from './Errors';
import { AgyProcess, layer as agyProcessLayer } from './Process';

/**
 * Discovers and runs AGY in non-interactive prompt mode.
 *
 * @errors AgyExitError, AgyProcessError, AgyJsonError
 */
export class Agy extends Context.Service<
  Agy,
  {
    /**
     * Checks whether the local AGY binary can be reached.
     *
     * @returns The AGY availability status.
     */
    readonly status: () => Effect.Effect<AgyStatus>;
    /**
     * Runs AGY with a prompt and returns plain text output.
     *
     * @param input - Prompt and AGY runtime options.
     * @returns Captured AGY text output.
     * @errors AgyExitError when AGY exits non-zero.
     */
    readonly runText: (
      input: AgyRunInput
    ) => Effect.Effect<AgyTextResult, AgyError>;
    /**
     * Runs AGY and parses stdout as a single strict JSON value.
     *
     * @param input - Prompt and AGY runtime options.
     * @returns Parsed JSON plus raw process output.
     * @errors AgyJsonError when stdout is empty, fenced, or invalid JSON.
     */
    readonly runJson: (
      input: AgyRunInput
    ) => Effect.Effect<AgyJsonResult, AgyError>;
  }
>()('@use-agy/effect/Agy') {}

export interface FakeAgyOptions {
  readonly status?: AgyStatus | undefined;
  readonly text?: AgyTextResult | undefined;
  readonly json?: AgyJsonResult | undefined;
}

const makeService = Effect.gen(function* () {
  const process = yield* AgyProcess;

  const status = Effect.fn('Agy.status')(function* () {
    const result = yield* process
      .run({ mode: 'status', prompt: '' })
      .pipe(
        Effect.catch(() =>
          Effect.succeed({ stdout: '', stderr: '', exitCode: 1 })
        )
      );
    return result.exitCode === 0 ? 'available' : 'unavailable';
  });

  const runText = Effect.fn('Agy.runText')(function* (input: AgyRunInput) {
    const output = yield* process.run({ ...input, mode: 'run' });
    if (output.exitCode !== 0) {
      return yield* new AgyExitError(output);
    }

    return output;
  });

  const runJson = Effect.fn('Agy.runJson')(function* (input: AgyRunInput) {
    const output = yield* runText(input);
    const value = yield* parseStrictJson(output.stdout);

    return {
      value,
      raw: output.stdout,
      stderr: output.stderr,
      exitCode: output.exitCode,
    };
  });

  return { status, runText, runJson };
});

/** Provides the AGY service with an externally supplied process adapter. */
export const testLayer = Layer.effect(Agy, makeService);

/** Provides the live AGY service backed by Bun process services. */
export const layer = testLayer.pipe(
  Layer.provide(agyProcessLayer),
  Layer.provide(BunServices.layer)
);

/**
 * Provides deterministic AGY behavior for service, API, RPC, and CLI tests.
 *
 * @param options - Optional fake status and run results.
 * @returns A layer that supplies the AGY service.
 */
export function fakeLayer(options: FakeAgyOptions = {}) {
  return Layer.succeed(
    Agy,
    Agy.of({
      status: () => Effect.succeed(options.status ?? 'available'),
      runText: () =>
        Effect.succeed(
          options.text ?? {
            stdout: '',
            stderr: '',
            exitCode: 0,
          }
        ),
      runJson: () =>
        Effect.succeed(
          options.json ?? {
            value: {},
            raw: '{}',
            stderr: '',
            exitCode: 0,
          }
        ),
    })
  );
}

/**
 * Parses one raw JSON value without accepting Markdown fences.
 *
 * @param raw - Raw AGY stdout.
 * @returns The parsed JSON value.
 * @errors AgyJsonError when stdout is empty, fenced, or invalid JSON.
 */
function parseStrictJson(raw: string): Effect.Effect<unknown, AgyJsonError> {
  const trimmed = raw.trim();

  if (
    trimmed.length === 0 ||
    trimmed.startsWith('```') ||
    trimmed.endsWith('```')
  ) {
    return Effect.fail(
      new AgyJsonError({
        raw,
        cause: new SyntaxError('Expected raw JSON without Markdown fences'),
      })
    );
  }

  return Effect.try({
    try: () => JSON.parse(trimmed),
    catch: (cause) => new AgyJsonError({ raw, cause }),
  });
}

//<skill-gen>
// ---
// name: use-agy
// description: "Use AGY through the shared Effect service, Bun CLI, and local API/RPC runtime."
// ---
//
// ## Service Layer
//
// - `packages/use-agy/effect/src/Modules/Agy/Service.ts` is the source of truth
//   for reusable AGY behavior.
// - Depend on the `Agy` Effect service for shared operations:
//   - `status()` returns `available` or `unavailable`.
//   - `runText(input)` returns captured `stdout`, `stderr`, and `exitCode`.
//   - `runJson(input)` returns parsed `value`, raw JSON text, `stderr`, and
//     `exitCode`.
// - Keep subprocess behavior out of callers. CLI, HTTP, and RPC surfaces should
//   call this service instead of invoking `agy` directly.
// - Use `fakeLayer` for deterministic tests and examples.
//
// ## Error Semantics
//
// - Non-zero AGY exits become `AgyExitError` with `stdout`, `stderr`, and
//   `exitCode`.
// - Invalid structured output becomes `AgyJsonError`; fenced Markdown JSON is
//   intentionally rejected.
// - Process-level startup/capture failures become `AgyProcessError` or
//   `AgyUnavailableError`.
//</skill-gen>
