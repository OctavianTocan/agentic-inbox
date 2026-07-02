import { Api } from '@app/api-core';
import { Effect, Layer } from 'effect';
import { HttpApiBuilder } from 'effect/unstable/httpapi';
import { AiDraftService, AiDraftServiceMock } from './Service';

/** Live `ai` handlers. */
export const HttpAiLive = HttpApiBuilder.group(
  Api,
  'ai',
  Effect.fn(function* (handlers) {
    const service = yield* AiDraftService;

    return handlers.handle('draft', ({ payload }) => service.draft(payload));
  })
).pipe(Layer.provide(AiDraftServiceMock));
