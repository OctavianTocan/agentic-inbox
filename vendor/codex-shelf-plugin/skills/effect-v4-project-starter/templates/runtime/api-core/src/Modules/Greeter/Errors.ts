import * as Schema from 'effect/Schema';
import * as HttpApiSchema from 'effect/unstable/httpapi/HttpApiSchema';

/** Public validation failure for a greeting requested with a blank name. */
export class EmptyNameError extends Schema.TaggedErrorClass<EmptyNameError>()(
  'EmptyNameError',
  {}
) {
  get message(): string {
    return 'Name must not be empty';
  }
}

/** HTTP 422 wrapper for blank-name validation failures. */
export const EmptyNameErrorResponse = EmptyNameError.pipe(
  HttpApiSchema.status(422)
);

export type GreeterContractError = EmptyNameError;
