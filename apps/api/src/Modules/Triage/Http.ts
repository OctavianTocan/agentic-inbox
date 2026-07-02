import { Api } from '@app/api-core';
import { Effect } from 'effect';
import { HttpApiBuilder } from 'effect/unstable/httpapi';
import { Slice } from '../../Slice/service';

/** Live `triage` handlers backed by the in-memory insurance slice. */
export const HttpTriageLive = HttpApiBuilder.group(
  Api,
  'triage',
  Effect.fn(function* (handlers) {
    const slice = yield* Slice;
    return handlers
      .handle('run', () => slice.runTriage())
      .handle('inbox', () => slice.listInbox());
  })
);
