import * as Console from 'effect/Console';
import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';
import * as CliError from 'effect/unstable/cli/CliError';

/** User-correctable CLI usage failure. */
export class CliUsageError extends Schema.TaggedErrorClass<CliUsageError>()(
  'CliUsageError',
  {
    message: Schema.String,
    hint: Schema.optional(Schema.String),
  }
) {}

/** Failure from AGY or another external runtime dependency. */
export class CliExternalError extends Schema.TaggedErrorClass<CliExternalError>()(
  'CliExternalError',
  {
    message: Schema.String,
    hint: Schema.optional(Schema.String),
  }
) {}

/** Unexpected failure inside the CLI itself. */
export class CliInternalError extends Schema.TaggedErrorClass<CliInternalError>()(
  'CliInternalError',
  {
    message: Schema.String,
    hint: Schema.optional(Schema.String),
  }
) {}

export type CliFailure = CliUsageError | CliExternalError | CliInternalError;

/**
 * Maps a normalized CLI failure to the agent-friendly process exit code.
 *
 * @param failure - Normalized CLI failure.
 * @returns Stable process exit code.
 */
export const exitCodeFor = (failure: CliFailure): number => {
  switch (failure._tag) {
    case 'CliUsageError':
      return 2;
    case 'CliExternalError':
      return 5;
    case 'CliInternalError':
      return 1;
  }
};

/**
 * Converts unknown command failures into the CLI error taxonomy.
 *
 * @param failure - Unknown failure raised by Effect CLI or use-agy services.
 * @returns Normalized CLI failure for display and exit-code mapping.
 */
export const normalizeFailure = (failure: unknown): CliFailure => {
  if (CliError.isCliError(failure)) {
    return new CliUsageError({ message: failure.message });
  }

  if (isTaggedError(failure)) {
    switch (failure._tag) {
      case 'CliUsageError':
        return new CliUsageError({ message: failure.message });
      case 'CliExternalError':
        return new CliExternalError({ message: failure.message });
      case 'CliInternalError':
        return new CliInternalError({ message: failure.message });
      case 'AgyProcessError':
      case 'AgyExitError':
      case 'AgyUnavailableError':
      case 'AgyJsonError':
        return new CliExternalError({
          message: failure.message,
        });
    }
  }

  return new CliInternalError({
    message:
      failure instanceof Error ? failure.message : 'Unexpected CLI failure',
  });
};

/**
 * Writes a normalized CLI failure to stderr.
 *
 * @param failure - Failure to render for an agent or human caller.
 * @returns Effect that writes diagnostics.
 */
export const writeFailure = (failure: CliFailure): Effect.Effect<void> =>
  Effect.gen(function* () {
    yield* Console.error(`error: ${failure.message}`);
    if (failure.hint !== undefined) {
      yield* Console.error(`hint: ${failure.hint}`);
    }
  });

/** Detects tagged failures that expose a public message. */
function isTaggedError(value: unknown): value is {
  readonly _tag: string;
  readonly message: string;
} {
  return (
    typeof value === 'object' &&
    value !== null &&
    '_tag' in value &&
    typeof value._tag === 'string' &&
    'message' in value &&
    typeof value.message === 'string'
  );
}
