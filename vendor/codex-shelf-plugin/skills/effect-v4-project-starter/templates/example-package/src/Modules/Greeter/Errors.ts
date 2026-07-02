import * as Schema from 'effect/Schema';

/** A greeting was requested for a blank name. */
export class EmptyNameError extends Schema.TaggedErrorClass<EmptyNameError>()(
  'EmptyNameError',
  {}
) {
  get message(): string {
    return 'Name must not be empty';
  }
}

export type GreeterError = EmptyNameError;
