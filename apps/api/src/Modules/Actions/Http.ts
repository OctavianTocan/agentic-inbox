import { Api } from '@app/api-core';
import { Effect } from 'effect';
import { HttpApiBuilder } from 'effect/unstable/httpapi';
import { Slice } from '../../Slice/service';

/** Live `actions` handlers backed by the in-memory insurance slice. */
export const HttpActionsLive = HttpApiBuilder.group(
  Api,
  'actions',
  Effect.fn(function* (handlers) {
    const slice = yield* Slice;
    return handlers
      .handle('resolveApproval', ({ params, payload }) =>
        slice.resolveApproval(params.id, payload)
      )
      .handle('undo', ({ params }) => slice.undoAction(params.id))
      .handle('ledger', () => slice.listLedger());
  })
);
