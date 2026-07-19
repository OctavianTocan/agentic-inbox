import { Schema } from 'effect';
import { RunId } from '../../Actions/Domain';
import { EmailId } from '../../Emails/Domain';
import { Proposal } from '../Domain';

//<skill-gen>
// ---
// name: domain-backend
// description: "Use when designing Effect HTTP API surfaces, module boundaries (Domain.ts / Errors.ts / Api.ts / Service.ts / Repo.ts), sub-modules, error shapes, Postgres persistence, or reviewing backend package layout in apps/api or packages/api-core. NOT for visual UI — use domain-design / domain-frontend."
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

/** Status of a triage run. */
export const TriageRunStatus: Schema.Literals<
  readonly ['pending', 'completed', 'failed']
> = Schema.Literals(['pending', 'completed', 'failed']).annotate({
  identifier: 'TriageRunStatus',
  description: 'Status of a triage run.'
});

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
  pending: Schema.optional(Schema.NullOr(Schema.Boolean)).annotate({
    description: 'Whether the triage run is pending.'
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
