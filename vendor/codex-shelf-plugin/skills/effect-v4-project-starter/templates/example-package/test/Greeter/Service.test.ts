import { it } from '@effect/vitest';
import * as Effect from 'effect/Effect';
import { describe, expect } from 'vitest';
import { EmptyNameError } from '@/Modules/Greeter/Errors';
import { fakeLayer, Greeter, layer } from '@/Modules/Greeter/Service';

describe('Greeter', () => {
  it.effect('greets a named recipient', () =>
    Effect.gen(function* () {
      const greeter = yield* Greeter;
      const greeting = yield* greeter.greet({ name: 'Ada' });

      expect(greeting.message).toBe('Hello, Ada!');
    }).pipe(Effect.provide(layer))
  );

  it.effect('fails on a blank name', () =>
    Effect.gen(function* () {
      const greeter = yield* Greeter;
      const error = yield* Effect.flip(greeter.greet({ name: '  ' }));

      expect(error).toBeInstanceOf(EmptyNameError);
    }).pipe(Effect.provide(layer))
  );

  it.effect('supports a fake layer', () =>
    Effect.gen(function* () {
      const greeter = yield* Greeter;
      const greeting = yield* greeter.greet({ name: 'ignored' });

      expect(greeting.message).toBe('Hello, test!');
    }).pipe(Effect.provide(fakeLayer()))
  );
});
