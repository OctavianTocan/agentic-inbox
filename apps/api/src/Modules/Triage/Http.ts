import { Api } from '@app/api-core';
import { Effect } from 'effect';
import { HttpApiBuilder } from 'effect/unstable/httpapi';

/** Placeholder `triage` handlers until the agent orchestrator lands in wave 3. */
export const HttpTriageLive = HttpApiBuilder.group(
  Api,
  'triage',
  Effect.fn(function* (handlers) {
    return handlers
      .handle('run', () => Effect.die('triage.run not implemented'))
      .handle('inbox', () => Effect.die('triage.inbox not implemented'));
  })
);
