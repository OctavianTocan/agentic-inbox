import { Api } from '@app/api-core';
import { LedgerEntryId } from '@app/api-core/Modules/Actions/Domain';
import { Effect, Schema } from 'effect';
import { HttpApiBuilder } from 'effect/unstable/httpapi';
import type { ActorType, LedgerEntryIdType } from '@/Lib/Ids';
import { AgentService } from '@/Modules/Agent/Service';
import { ActionService } from './Service';

const USER_ACTOR: ActorType = 'user';

/** Live `actions` handlers. */
export const HttpActionsLive = HttpApiBuilder.group(
  Api,
  'actions',
  Effect.fn(function* (handlers) {
    const actions = yield* ActionService;
    const agent = yield* AgentService;
    return handlers
      .handle('resolveApproval', ({ params, payload }) =>
        agent.resolveApproval(params.id, payload).pipe(
          Effect.catchTag('ActionNotFound', (error) => Effect.die(error)),
          Effect.catchTag('ActionNotUndoable', (error) => Effect.die(error)),
          Effect.catchTag('ConfigError', (error) => Effect.die(error)),
          Effect.catchTag('AiError', (error) => Effect.die(error))
        )
      )
      .handle('undo', ({ params }) =>
        actions.undoAction(decodeLedgerEntryId(params.id), USER_ACTOR)
      )
      .handle('ledger', () => actions.listLedger());
  })
);

const decodeLedgerEntryId = (id: string): LedgerEntryIdType =>
  Schema.decodeUnknownSync(LedgerEntryId)(id);
