import { Api } from '@app/api-core';
import { Effect } from 'effect';
import { HttpApiBuilder } from 'effect/unstable/httpapi';
import type { ActorType } from '@/Lib/Ids';
import { AgentService } from '@/Modules/Agent/Service';
import { ActionService } from './Service';

//<skill-gen>
// ---
// name: domain-backend
// description: "Use when designing Effect HTTP API surfaces (HttpApi, HttpApiClient, branded params, typed errors), Effect Config / AppConfig, module boundaries (Domain/Errors/Api/Service/Repo), sub-modules, Postgres persistence, or reviewing backend layout in apps/api or packages/api-core. Prefer repos/effect-smol and agent-patterns/ for Effect idioms. NOT for visual UI."
// ---
//
// ## HttpApi handlers
//
// - `HttpApiBuilder.group(Api, 'group', …)` then `handlers.handle('endpoint', …)`.
// - `Effect.fail` declared endpoint errors; do **not** `Effect.die` / `orDie` domain errors that belong in OpenAPI.
// - Infra failures (`ConfigError`, `AiError`) may stay defects (500) unless declared as typed 5xx schemas.
// - Never `Schema.decodeUnknownSync` path/body ids in handlers — endpoint params already decoded.
// - See `agent-patterns/effect-httpapi.md`.
//</skill-gen>

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
          // Infra / model failures stay defects (500); domain errors stay typed.
          Effect.catchTag('ConfigError', (error) => Effect.die(error)),
          Effect.catchTag('AiError', (error) => Effect.die(error))
        )
      )
      .handle('undo', ({ params }) => actions.undoAction(params.id, USER_ACTOR))
      .handle('ledger', () => actions.listLedger());
  })
);
