import { Api } from '@use-agy/api-core/Api';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as HttpApiBuilder from 'effect/unstable/httpapi/HttpApiBuilder';
import { LocalAgyApi, layer as LocalAgyApiLive } from './Service';

/** HTTP handlers for the local AGY API contract. */
export const AgyHttpLive = HttpApiBuilder.group(Api, 'agy', (handlers) =>
  Effect.gen(function* () {
    const agy = yield* LocalAgyApi;

    return handlers
      .handle('status', () => agy.status())
      .handle('runText', ({ payload }) => agy.runText(payload))
      .handle('runJson', ({ payload }) => agy.runJson(payload));
  })
).pipe(Layer.provide(LocalAgyApiLive));
