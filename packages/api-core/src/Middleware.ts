import { Effect, Schema } from 'effect';
import { HttpApiMiddleware, HttpApiSchema } from 'effect/unstable/httpapi';

/** Structured 422 when request params/query/payload fail schema decode. */
export class RequestValidationError extends Schema.TaggedErrorClass<RequestValidationError>()(
  'RequestValidationError',
  {
    message: Schema.String
  }
) {}

/**
 * Middleware that turns opaque HttpApi schema decode failures into
 * {@link RequestValidationError} JSON responses.
 */
export class SchemaErrorHandler extends HttpApiMiddleware.Service<SchemaErrorHandler>()(
  'api/SchemaErrorHandler',
  {
    error: RequestValidationError.pipe(HttpApiSchema.status(422))
  }
) {}

/** Live transform: map decode SchemaError → RequestValidationError. */
export const SchemaErrorHandlerLive =
  HttpApiMiddleware.layerSchemaErrorTransform(
    SchemaErrorHandler,
    (schemaError) =>
      Effect.fail(
        new RequestValidationError({
          message: `Invalid request: ${schemaError.message}`
        })
      )
  );
