import * as Schema from 'effect/Schema';
import * as HttpApiSchema from 'effect/unstable/httpapi/HttpApiSchema';

/** Public validation failure for malformed AGY run requests. */
export class AgyValidationError extends Schema.TaggedErrorClass<AgyValidationError>()(
  'AgyValidationError',
  {
    field: Schema.String,
    detail: Schema.String,
  }
) {}

/** Public failure for AGY runs that reached the binary but did not succeed. */
export class AgyRunError extends Schema.TaggedErrorClass<AgyRunError>()(
  'AgyRunError',
  {
    reason: Schema.String,
    exitCode: Schema.optional(Schema.Number),
    stdout: Schema.optional(Schema.String),
    stderr: Schema.optional(Schema.String),
  }
) {}

/** Public failure for a temporarily unavailable local AGY runtime. */
export class AgyUnavailableError extends Schema.TaggedErrorClass<AgyUnavailableError>()(
  'AgyUnavailableError',
  {}
) {
  get message(): string {
    return 'AGY service is temporarily unavailable';
  }
}

/** Public failure for AGY output that is not valid strict JSON. */
export class AgyJsonParseError extends Schema.TaggedErrorClass<AgyJsonParseError>()(
  'AgyJsonParseError',
  {
    raw: Schema.String,
  }
) {}

/** HTTP 400 wrapper for request validation failures. */
export const AgyValidationErrorResponse = AgyValidationError.pipe(
  HttpApiSchema.status(400)
);

/** HTTP 500 wrapper for AGY execution failures. */
export const AgyRunErrorResponse = AgyRunError.pipe(HttpApiSchema.status(500));

/** HTTP 503 wrapper for unavailable local AGY runtime failures. */
export const AgyUnavailableErrorResponse = AgyUnavailableError.pipe(
  HttpApiSchema.status(503)
);

/** HTTP 422 wrapper for invalid AGY JSON output failures. */
export const AgyJsonParseErrorResponse = AgyJsonParseError.pipe(
  HttpApiSchema.status(422)
);

/** Union of public AGY execution errors. */
export const AgyRunErrors = Schema.Union([
  AgyValidationError,
  AgyRunError,
  AgyUnavailableError,
  AgyJsonParseError,
]);

export type AgyContractError =
  | AgyValidationError
  | AgyRunError
  | AgyUnavailableError
  | AgyJsonParseError;
