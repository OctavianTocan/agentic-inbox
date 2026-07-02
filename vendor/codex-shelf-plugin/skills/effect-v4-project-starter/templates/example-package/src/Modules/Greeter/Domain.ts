import * as Schema from 'effect/Schema';

/** Input accepted by the greeter service. */
export const GreetInput = Schema.Struct({
  name: Schema.String,
});
export type GreetInput = Schema.Schema.Type<typeof GreetInput>;

/** A rendered greeting. */
export const Greeting = Schema.Struct({
  message: Schema.String,
});
export type Greeting = Schema.Schema.Type<typeof Greeting>;
