import type { TriageRun } from '@app/api-core/Modules/Triage/Runs/Domain';
import { Context, type Effect } from 'effect';
import type { EmailIdType, RunIdType } from '@/Lib/Ids';

//<skill-gen>
// ---
// name: domain-backend
// description: "Use when designing Effect HTTP API surfaces, module boundaries (Domain.ts / Errors.ts / Api.ts / Service.ts / Repo.ts), sub-modules, error shapes, Postgres persistence, or reviewing backend package layout in apps/api or packages/api-core. NOT for visual UI — use domain-design / domain-frontend."
// ---
//
// ## Example: Triage runs sub-module
//
// `$$directory` holds the runs aggregate. Repo methods are whole-entity only
// (`create` / `upsert` / `get` / optional `listByEmail` / wipe deletes).
// Status and pending transitions belong in `TriageService` / the engine, which
// build an updated `TriageRun` and upsert — never `updateStatus` on the repo.
// Public HTTP stays intent-shaped (`run triage`, `resume by runId`), not CRUD on runs.
//</skill-gen>

/** Persistence for triage runs (one attempt per `runId` / thread id). */
export class TriageRunsRepo extends Context.Service<
  TriageRunsRepo,
  {
    readonly create: (run: TriageRun) => Effect.Effect<TriageRun>;
    readonly upsert: (run: TriageRun) => Effect.Effect<TriageRun>;
    readonly get: (id: RunIdType) => Effect.Effect<TriageRun | null>;
    readonly listByEmail: (
      emailId: EmailIdType
    ) => Effect.Effect<ReadonlyArray<TriageRun>>;
    readonly deleteByEmail: (emailId: EmailIdType) => Effect.Effect<void>;
    readonly deleteAll: () => Effect.Effect<void>;
  }
>()('@apps/api/Triage/Runs/TriageRunsRepo') {}
