import { Schema } from 'effect';
import { ActionKind, RunId } from '../../Actions/Domain';
import { EmailId } from '../../Emails/Domain';
import { Proposal } from '../Domain';

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
// `apps/api/src/Modules/Triage/Runs/` path. Keep HttpApi groups at the parent
// unless the sub-module is independently HTTP-exposed.
// Batch HTTP `TriageRunRequest` stays on the parent `Triage/Domain.ts`.
//</skill-gen>

/** Lifecycle of a triage run (one attempt / thread). */
export const TriageRunStatus: Schema.Literals<
  readonly ['running', 'interrupted', 'completed', 'failed']
> = Schema.Literals(['running', 'interrupted', 'completed', 'failed']).annotate(
  {
    identifier: 'TriageRunStatus',
    description:
      'Lifecycle of a triage run: in progress, paused for human approval, finished, or failed.'
  }
);

/** HITL payload stored on a run while it is interrupted for approval. */
export class TriageRunPending extends Schema.Class<TriageRunPending>(
  'TriageRunPending'
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

/** Error for a triage run. */
export class TriageRunError extends Schema.Class<TriageRunError>(
  'TriageRunError'
)({
  message: Schema.String.annotate({
    description: 'Error message for the triage run.'
  }),
  stack: Schema.optional(Schema.String).annotate({
    description: 'Stack trace for the triage run.'
  })
}) {}

/** Triage run. */
export class TriageRun extends Schema.Class<TriageRun>('TriageRun')({
  id: RunId,
  emailId: EmailId,
  status: TriageRunStatus,
  proposal: Proposal,
  proposalSummary: Schema.String.annotate({
    description: 'Summary of the proposal for the triage run.'
  }),
  // `optional(NullOr(...))` so SQL NULL and omitted keys both decode cleanly.
  pending: Schema.optional(Schema.NullOr(TriageRunPending)).annotate({
    description: 'Approval payload while status is interrupted; null otherwise.'
  }),
  decisionSnapshot: Schema.optional(Schema.NullOr(Schema.Json)).annotate({
    description: 'Snapshot of the decision for the triage run.'
  }),
  policyVersion: Schema.optional(Schema.NullOr(Schema.String)).annotate({
    description: 'Version of the policy used for the triage run.'
  }),
  promptVersion: Schema.optional(Schema.NullOr(Schema.String)).annotate({
    description: 'Version of the prompt used for the triage run.'
  }),
  graphVersion: Schema.optional(Schema.NullOr(Schema.String)).annotate({
    description: 'Version of the graph used for the triage run.'
  }),
  error: Schema.optional(Schema.NullOr(TriageRunError)).annotate({
    description: 'Error message for the triage run.'
  }),
  createdAt: Schema.String.annotate({
    description: 'Timestamp of the creation of the triage run.'
  }),
  updatedAt: Schema.String.annotate({
    description: 'Timestamp of the last update of the triage run.'
  })
}) {}
