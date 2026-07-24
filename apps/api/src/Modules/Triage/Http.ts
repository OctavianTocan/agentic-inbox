import { Api } from '@app/api-core';
import { Effect } from 'effect';
import { HttpApiBuilder } from 'effect/unstable/httpapi';
import { InboxOrchestrator } from './Service';

/** Live `triage` handlers. */
export const HttpTriageLive = HttpApiBuilder.group(
  Api,
  'triage',
  Effect.fn(function* (handlers) {
    const triage = yield* InboxOrchestrator;
    return handlers
      .handle('run', ({ payload }) => triage.run(payload.fresh ?? false))
      .handle('retriage', ({ params }) => triage.retriage(params.id))
      .handle('inbox', () => triage.inbox());
  })
);
