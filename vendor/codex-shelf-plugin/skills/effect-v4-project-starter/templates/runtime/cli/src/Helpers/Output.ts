import * as Console from 'effect/Console';
import * as Effect from 'effect/Effect';
import * as Flag from 'effect/unstable/cli/Flag';
import { CliUsageError } from './Errors';

export type OutputMode = 'human' | 'json' | 'plain';

/** Flag for JSON-only stdout output. */
export const jsonFlag = Flag.boolean('json').pipe(
  Flag.withDefault(false),
  Flag.withDescription('Write JSON data to stdout with no progress text.')
);

/** Flag for terse machine-readable stdout output. */
export const plainFlag = Flag.boolean('plain').pipe(
  Flag.withDefault(false),
  Flag.withDescription('Write plain machine-readable data to stdout.')
);

/**
 * Resolves mutually exclusive output flags into the selected mode.
 *
 * @param input - Output-mode flag values.
 * @returns Selected output mode.
 * @errors CliUsageError when incompatible modes are requested together.
 */
export const outputMode = (input: {
  readonly json: boolean;
  readonly plain: boolean;
}): Effect.Effect<OutputMode, CliUsageError> => {
  if (input.json && input.plain) {
    return Effect.fail(
      new CliUsageError({
        message: 'Choose only one output mode.',
        hint: 'Use either --json or --plain.',
      })
    );
  }

  return Effect.succeed(input.json ? 'json' : input.plain ? 'plain' : 'human');
};

/**
 * Writes a line to stdout.
 *
 * @param text - Text to write.
 * @returns Effect that writes to stdout.
 */
export const stdout = (text: string): Effect.Effect<void> => Console.log(text);

/**
 * Writes a line to stderr.
 *
 * @param text - Text to write.
 * @returns Effect that writes to stderr.
 */
export const stderr = (text: string): Effect.Effect<void> =>
  Console.error(text);

/**
 * Writes a JSON value to stdout.
 *
 * @param value - JSON-serializable value to print.
 * @returns Effect that writes formatted JSON.
 */
export const writeJson = (value: unknown): Effect.Effect<void> =>
  stdout(JSON.stringify(value, null, 2));
