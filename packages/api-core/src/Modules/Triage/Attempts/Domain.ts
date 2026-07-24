import { Schema } from 'effect';
import { ActionKind, AttemptId } from '../../Actions/Domain';
import { EmailId } from '../../Emails/Domain';
import { NextAction } from '../Domain';

//<skill-gen>
// ---
// name: domain-backend
// description: "Use when designing Effect HTTP API surfaces (HttpApi, HttpApiClient, branded params, typed errors), Effect Config / AppConfig, module boundaries (Domain/Errors/Api/Service/Repo), sub-modules, Postgres persistence, or reviewing backend layout in apps/api or packages/api-core. Prefer repos/effect-smol and docs/agent-patterns/ for Effect idioms. NOT for visual UI."
// ---
//
// ## api-core sub-modules
//
// Extra aggregates under a parent module live in a subfolder (`$$directory`):
// `Domain.ts` here, runtime `Repo.ts` / services under the matching
// `apps/api/src/Modules/Triage/Attempts/` path. Keep HttpApi groups at the parent
// unless the sub-module is independently HTTP-exposed.
// Batch HTTP `TriageRunRequest` stays on the parent `Triage/Domain.ts`.
//</skill-gen>

/** Lifecycle of a triage attempt (one attempt / thread). */
export const AttemptStatus: Schema.Literals<
  readonly ['running', 'interrupted', 'completed', 'failed']
> = Schema.Literals(['running', 'interrupted', 'completed', 'failed']).annotate(
  {
    identifier: 'AttemptStatus',
    description:
      'Lifecycle of a triage attempt: in progress, paused for human approval, finished, or failed.'
  }
);

/** HITL payload stored on an attempt while it is interrupted for approval. */
export class AttemptPending extends Schema.Class<AttemptPending>(
  'AttemptPending'
)({
  action: ActionKind,
  summary: Schema.String.annotate({
    description: 'What the agent proposes to do if approved.'
  }),
  payload: Schema.Record(Schema.String, Schema.Unknown).annotate({
    description: 'Proposed tool arguments (e.g. the draft reply body).'
  }),
  actionRevision: Schema.Number.annotate({
    description: 'Revision number of the action awaiting approval.'
  })
}) {}

/** Error for a triage attempt. */
export class AttemptError extends Schema.Class<AttemptError>('AttemptError')({
  message: Schema.String.annotate({
    description: 'Error message for the triage attempt.'
  }),
  stack: Schema.optional(Schema.String).annotate({
    description: 'Stack trace for the triage attempt.'
  })
}) {}

/** One triage attempt (persisted as `triage_runs`). */
export class Attempt extends Schema.Class<Attempt>('Attempt')({
  id: AttemptId,
  emailId: EmailId,
  status: AttemptStatus,
  nextAction: NextAction,
  proposalSummary: Schema.String.annotate({
    description: 'Summary of the next action for the triage attempt.'
  }),
  // `optional(NullOr(...))` so SQL NULL and omitted keys both decode cleanly.
  pending: Schema.optional(Schema.NullOr(AttemptPending)).annotate({
    description: 'Approval payload while status is interrupted; null otherwise.'
  }),
  decisionSnapshot: Schema.optional(Schema.NullOr(Schema.Json)).annotate({
    description: 'Snapshot of the classification for the triage attempt.'
  }),
  policyVersion: Schema.optional(Schema.NullOr(Schema.String)).annotate({
    description: 'Version of the policy used for the triage attempt.'
  }),
  promptVersion: Schema.optional(Schema.NullOr(Schema.String)).annotate({
    description: 'Version of the prompt used for the triage attempt.'
  }),
  graphVersion: Schema.optional(Schema.NullOr(Schema.String)).annotate({
    description: 'Version of the graph used for the triage attempt.'
  }),
  error: Schema.optional(Schema.NullOr(AttemptError)).annotate({
    description: 'Error message for the triage attempt.'
  }),
  createdAt: Schema.String.annotate({
    description: 'Timestamp of the creation of the triage attempt.'
  }),
  updatedAt: Schema.String.annotate({
    description: 'Timestamp of the last update of the triage attempt.'
  })
}) {}
