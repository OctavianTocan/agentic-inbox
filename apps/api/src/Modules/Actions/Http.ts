import { Api } from '@app/api-core';
import { Effect } from 'effect';
import { HttpApiBuilder } from 'effect/unstable/httpapi';

/** Placeholder `actions` handlers until the ledger service lands in wave 3. */
export const HttpActionsLive = HttpApiBuilder.group(
  Api,
  'actions',
  Effect.fn(function* (handlers) {
    return handlers
      .handle('resolveApproval', () =>
        Effect.die('actions.resolveApproval not implemented')
      )
      .handle('undo', () => Effect.die('actions.undo not implemented'))
      .handle('ledger', () => Effect.die('actions.ledger not implemented'));
  })
);
