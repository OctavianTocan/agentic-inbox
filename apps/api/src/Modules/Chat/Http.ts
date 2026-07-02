import { Api } from '@app/api-core';
import { Effect } from 'effect';
import { HttpApiBuilder } from 'effect/unstable/httpapi';

/** Placeholder `chat` handler until the chat agent lands in wave 3. */
export const HttpChatLive = HttpApiBuilder.group(
  Api,
  'chat',
  Effect.fn(function* (handlers) {
    return handlers.handle('send', () =>
      Effect.die('chat.send not implemented')
    );
  })
);
