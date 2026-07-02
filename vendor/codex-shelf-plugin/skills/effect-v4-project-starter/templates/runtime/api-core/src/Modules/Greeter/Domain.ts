import * as Schema from 'effect/Schema';

/** Public request schema for a greeting. */
export const GreetRequest = Schema.Struct({
  name: Schema.String,
});

export type GreetRequest = Schema.Schema.Type<typeof GreetRequest>;

/** Public response schema for a rendered greeting. */
export const GreetResponse = Schema.Struct({
  message: Schema.String,
});

export type GreetResponse = Schema.Schema.Type<typeof GreetResponse>;
