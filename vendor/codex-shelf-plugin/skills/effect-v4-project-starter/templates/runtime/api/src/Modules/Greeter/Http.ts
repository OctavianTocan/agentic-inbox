import { Api } from '@{{SCOPE}}/api-core/Api';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as HttpApiBuilder from 'effect/unstable/httpapi/HttpApiBuilder';
import { LocalGreeterApi, layer as LocalGreeterApiLive } from './Service';

/** HTTP handlers for the local Greeter API contract. */
export const GreeterHttpLive = HttpApiBuilder.group(
  Api,
  'greeter',
  (handlers) =>
    Effect.gen(function* () {
      const greeter = yield* LocalGreeterApi;

      return handlers.handle('greet', ({ payload }) => greeter.greet(payload));
    })
).pipe(Layer.provide(LocalGreeterApiLive));
