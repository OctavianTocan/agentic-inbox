import { it } from '@effect/vitest';
import { EmptyNameError } from '@{{SCOPE}}/api-core/Modules/Greeter/Errors';
import {
  fakeLayer,
  layer as GreeterLive,
} from '@{{SCOPE}}/{{PACKAGE}}/Modules/Greeter/Service';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import { describe, expect } from 'vitest';
import { GreeterHttpLive } from '../../src/Modules/Greeter/Http';
import {
  LocalGreeterApi,
  layer as LocalGreeterApiLive,
} from '../../src/Modules/Greeter/Service';

describe('Greeter API handlers', () => {
  it.effect('maps greetings through the app facade', () =>
    Effect.gen(function* () {
      const greeter = yield* LocalGreeterApi;
      const result = yield* greeter.greet({ name: 'Ada' });

      expect(result).toEqual({ message: 'Hello, Ada!' });
    }).pipe(Effect.provide(LocalGreeterApiLive), Effect.provide(GreeterLive))
  );

  it.effect('classifies blank names as empty-name errors', () =>
    Effect.gen(function* () {
      const greeter = yield* LocalGreeterApi;
      const error = yield* Effect.flip(greeter.greet({ name: '   ' }));

      expect(error).toBeInstanceOf(EmptyNameError);
    }).pipe(Effect.provide(LocalGreeterApiLive), Effect.provide(GreeterLive))
  );

  it.effect('greets through a fake Greeter layer', () =>
    Effect.gen(function* () {
      const greeter = yield* LocalGreeterApi;
      const result = yield* greeter.greet({ name: 'ignored' });

      expect(result).toEqual({ message: 'Hello, test!' });
    }).pipe(Effect.provide(LocalGreeterApiLive), Effect.provide(fakeLayer()))
  );

  it.effect('builds the HTTP handler group from a fake Greeter layer', () =>
    Effect.scoped(
      Layer.build(GreeterHttpLive.pipe(Layer.provide(fakeLayer()))).pipe(
        Effect.asVoid
      )
    )
  );
});
