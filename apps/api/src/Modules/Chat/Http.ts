import { Api } from '@app/api-core';
import { ChatFailed } from '@app/api-core/Modules/Chat/Errors';
import { Effect, Stream } from 'effect';
import { HttpApiBuilder } from 'effect/unstable/httpapi';
import { ChatAgent } from '@/Modules/Agent/ChatAgent';

/**
 * Wraps a chat turn so any failure is logged in full before it is mapped to the
 * client-facing `ChatFailed`, streaming the resolved events on success.
 */
export const streamChatTurn = <A, E, R>(
  turn: Effect.Effect<ReadonlyArray<A>, E, R>
): Effect.Effect<Stream.Stream<A>, ChatFailed, R> =>
  turn.pipe(
    Effect.map(Stream.fromIterable),
    Effect.tapCause((cause) => Effect.logError('chat turn failed', cause)),
    Effect.mapError(
      (error) =>
        new ChatFailed({
          detail: error instanceof Error ? error.message : 'chat failed'
        })
    )
  );

/** Live `chat` handler. */
export const HttpChatLive = HttpApiBuilder.group(
  Api,
  'chat',
  Effect.fn(function* (handlers) {
    const chatAgent = yield* ChatAgent;
    return handlers.handle('send', ({ payload }) =>
      streamChatTurn(chatAgent.chat(payload))
    );
  })
);
