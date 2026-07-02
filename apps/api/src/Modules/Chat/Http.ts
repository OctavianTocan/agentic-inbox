import { Api } from '@app/api-core';
import { ChatFailed } from '@app/api-core/Modules/Chat/Errors';
import { Effect, Stream } from 'effect';
import { HttpApiBuilder } from 'effect/unstable/httpapi';
import { AgentService } from '@/Modules/Agent/Service';

/** Live `chat` handler. */
export const HttpChatLive = HttpApiBuilder.group(
  Api,
  'chat',
  Effect.fn(function* (handlers) {
    const agent = yield* AgentService;
    return handlers.handle('send', ({ payload }) =>
      agent.chat(payload).pipe(
        Effect.map(Stream.fromIterable),
        Effect.mapError(
          (error) =>
            new ChatFailed({
              detail: error instanceof Error ? error.message : 'chat failed'
            })
        )
      )
    );
  })
);
