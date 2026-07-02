import * as Context from 'effect/Context';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import type { GreetInput, Greeting } from './Domain';
import { EmptyNameError } from './Errors';

/** Supplies the salutation word used to build greetings. */
export class Salutation extends Context.Service<
  Salutation,
  {
    /**
     * Returns the salutation word.
     *
     * @returns The greeting word, e.g. `Hello`.
     */
    readonly word: () => Effect.Effect<string>;
  }
>()('@{{SCOPE}}/{{PACKAGE}}/Salutation') {}

/** Provides the default English salutation. */
export const salutationLayer = Layer.succeed(
  Salutation,
  Salutation.of({ word: () => Effect.succeed('Hello') })
);

/**
 * Renders greetings for named recipients.
 *
 * @errors EmptyNameError
 */
export class Greeter extends Context.Service<
  Greeter,
  {
    /**
     * Builds a greeting for a recipient.
     *
     * @param input - Recipient name.
     * @returns The rendered greeting.
     * @errors EmptyNameError when the name is blank.
     */
    readonly greet: (
      input: GreetInput
    ) => Effect.Effect<Greeting, EmptyNameError>;
  }
>()('@{{SCOPE}}/{{PACKAGE}}/Greeter') {}

const makeService = Effect.gen(function* () {
  const salutation = yield* Salutation;

  const greet = Effect.fn('Greeter.greet')(function* (input: GreetInput) {
    if (input.name.trim().length === 0) {
      return yield* new EmptyNameError();
    }

    const word = yield* salutation.word();
    return { message: `${word}, ${input.name}!` };
  });

  return { greet };
});

/** Provides the live greeter service backed by the default salutation. */
export const layer = Layer.effect(Greeter, makeService).pipe(
  Layer.provide(salutationLayer)
);

/**
 * Provides a deterministic greeter for tests and examples.
 *
 * @param message - Fixed message the fake greeter returns.
 * @returns A layer that supplies the greeter service.
 */
export function fakeLayer(message = 'Hello, test!') {
  return Layer.succeed(
    Greeter,
    Greeter.of({
      greet: () => Effect.succeed({ message }),
    })
  );
}
