import { Api } from '@app/api-core';
import { Effect } from 'effect';
import { HttpApiBuilder } from 'effect/unstable/httpapi';
import type { ActorType } from '@/Lib/Ids';
import { ChatAgent } from '@/Modules/Agent/ChatAgent';
import { LedgerService } from './Service';

/** Live `actions` handlers. */
export const HttpActionsLive = HttpApiBuilder.group(
  Api,
  'actions',
  Effect.fn(function* (handlers) {
    const actions = yield* LedgerService;
    const chatAgent = yield* ChatAgent;
    return handlers
      .handle('resolveApproval', ({ params, payload }) =>
        chatAgent.resolveApproval(params.id, payload).pipe(
          Effect.catchTag('ConfigError', (error) => Effect.die(error)),
          Effect.catchTag('AiError', (error) => Effect.die(error))
        )
      )
      .handle('undo', ({ params }) => actions.undoAction(params.id, USER_ACTOR))
      .handle('ledger', () => actions.listLedger());
  })
);

const USER_ACTOR: ActorType = 'user';
