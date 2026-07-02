import type {
  AgyJsonRunResponse,
  AgyRunRequest,
  AgyStatus,
  AgyTextRunResponse,
} from '@use-agy/api-core/Modules/Agy/Domain';
import {
  type AgyContractError,
  AgyJsonParseError,
  AgyRunError,
  AgyUnavailableError,
  AgyValidationError,
} from '@use-agy/api-core/Modules/Agy/Errors';
import type { AgyError } from '@use-agy/effect/Modules/Agy/Errors';
import {
  AgyExitError,
  AgyJsonError,
  AgyProcessError,
  AgyUnavailableError as EffectAgyUnavailableError,
} from '@use-agy/effect/Modules/Agy/Errors';
import { Agy } from '@use-agy/effect/Modules/Agy/Service';
import * as Context from 'effect/Context';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';

/**
 * Local API facade that validates requests and maps AGY service errors.
 *
 * @errors AgyValidationError, AgyRunError, AgyUnavailableError, AgyJsonParseError
 */
export class LocalAgyApi extends Context.Service<
  LocalAgyApi,
  {
    /**
     * Reports local AGY availability.
     *
     * @returns Public AGY availability status.
     * @errors AgyUnavailableError when the status probe cannot complete.
     */
    readonly status: () => Effect.Effect<AgyStatus, AgyUnavailableError>;
    /**
     * Runs AGY and returns captured text output.
     *
     * @param input - Public AGY run request.
     * @returns Captured text response.
     * @errors AgyValidationError when the prompt is empty.
     * @errors AgyRunError when AGY exits non-zero.
     * @errors AgyUnavailableError when AGY cannot be started.
     */
    readonly runText: (
      input: AgyRunRequest
    ) => Effect.Effect<
      AgyTextRunResponse,
      AgyValidationError | AgyRunError | AgyUnavailableError
    >;
    /**
     * Runs AGY and parses stdout as strict JSON.
     *
     * @param input - Public AGY run request.
     * @returns Parsed JSON response.
     * @errors AgyValidationError when the prompt is empty.
     * @errors AgyJsonParseError when stdout is not strict JSON.
     * @errors AgyRunError when AGY exits non-zero.
     * @errors AgyUnavailableError when AGY cannot be started.
     */
    readonly runJson: (
      input: AgyRunRequest
    ) => Effect.Effect<AgyJsonRunResponse, AgyContractError>;
  }
>()('@apps/use-agy-api/Modules/Agy/LocalAgyApi') {}

/** Provides the local AGY API facade over the shared AGY service. */
export const layer = Layer.effect(
  LocalAgyApi,
  Effect.gen(function* () {
    const agy = yield* Agy;

    return LocalAgyApi.of({
      status: () =>
        agy.status().pipe(Effect.mapError(() => new AgyUnavailableError())),
      runText: (request) =>
        validateRequest(request).pipe(
          Effect.flatMap((input) => agy.runText(input)),
          Effect.mapError(mapTextError)
        ),
      runJson: (request) =>
        validateRequest(request).pipe(
          Effect.flatMap((input) => agy.runJson(input)),
          Effect.mapError(mapJsonError)
        ),
    });
  })
);

/**
 * Validates public AGY run requests before invoking the service layer.
 *
 * @param request - Public AGY run request.
 * @returns The request when it can be executed.
 * @errors AgyValidationError when the prompt is empty.
 */
export function validateRequest(
  request: AgyRunRequest
): Effect.Effect<AgyRunRequest, AgyValidationError> {
  if (request.prompt.trim().length === 0) {
    return Effect.fail(
      new AgyValidationError({
        field: 'prompt',
        detail: 'Prompt must not be empty.',
      })
    );
  }

  return Effect.succeed(request);
}

/** Maps text-run service failures into public API errors. */
function mapTextError(
  error: AgyValidationError | AgyError
): AgyValidationError | AgyRunError | AgyUnavailableError {
  if (error instanceof AgyValidationError) {
    return error;
  }

  return mapAgyError(error);
}

/** Maps JSON-run service failures into public API errors. */
function mapJsonError(error: AgyValidationError | AgyError): AgyContractError {
  if (error instanceof AgyValidationError) {
    return error;
  }

  if (error instanceof AgyJsonError) {
    return new AgyJsonParseError({ raw: error.raw });
  }

  return mapAgyError(error);
}

/** Maps shared AGY service failures into transport-safe public errors. */
function mapAgyError(error: AgyError): AgyRunError | AgyUnavailableError {
  if (error instanceof AgyExitError) {
    return new AgyRunError({
      reason: 'AGY exited non-zero.',
      exitCode: error.exitCode,
      stdout: error.stdout,
      stderr: error.stderr,
    });
  }

  if (
    error instanceof AgyProcessError ||
    error instanceof EffectAgyUnavailableError
  ) {
    return new AgyUnavailableError();
  }

  return new AgyRunError({ reason: error.message });
}
