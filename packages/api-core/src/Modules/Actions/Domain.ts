import { Schema } from 'effect';
import { EmailId } from '../Emails/Domain';

/** Identifier of a ledger entry (append-only action record). */
export const LedgerEntryId: Schema.String = Schema.String.pipe(
  Schema.check(Schema.isNonEmpty())
).annotate({
  identifier: 'LedgerEntryId',
  description: 'Unique id of an action-ledger entry.'
});

/** Identifier of a pending approval request. */
export const ApprovalId: Schema.String = Schema.String.pipe(
  Schema.check(Schema.isNonEmpty())
).annotate({
  identifier: 'ApprovalId',
  description: 'Unique id of a pending approval request.'
});

/** Identifier of a triage attempt (wire: runId). */
export const AttemptId: Schema.String = Schema.String.pipe(
  Schema.check(Schema.isNonEmpty())
).annotate({
  identifier: 'AttemptId',
  description: 'Unique id of a triage attempt (runId === thread_id).'
});

/** Who performed an action. */
export const Actor: Schema.Literals<
  readonly ['batch_agent', 'chat_agent', 'user']
> = Schema.Literals(['batch_agent', 'chat_agent', 'user']).annotate({
  identifier: 'Actor',
  description:
    'Originator of an action: the batch triage agent, the chat agent, or the human.'
});

/** Mutating tool an actor invoked. */
export const ActionKind: Schema.Literals<
  readonly ['send_reply', 'archive', 'flag_for_review', 'undo']
> = Schema.Literals([
  'send_reply',
  'archive',
  'flag_for_review',
  'undo'
]).annotate({
  identifier: 'ActionKind',
  description: 'The mutating tool executed for a ledger entry.'
});

/** An append-only record of one executed action, shown in the agent trace. */
export class LedgerEntry extends Schema.Class<LedgerEntry>('LedgerEntry')({
  id: LedgerEntryId,
  runId: Schema.NullOr(AttemptId).annotate({
    identifier: 'runId',
    description:
      'The attempt id for this action, or null if the action is not part of an attempt.'
  }),
  actor: Actor,
  emailId: EmailId,
  action: ActionKind,
  actionRevision: Schema.Number.annotate({
    description: 'Revision number of the action.'
  }),
  summary: Schema.String.annotate({
    description: 'Human-readable one-line description of what happened.'
  }),
  payload: Schema.Record(Schema.String, Schema.Unknown).annotate({
    description: 'Tool arguments captured at execution time (e.g. draft body).'
  }),
  undoneBy: Schema.NullOr(LedgerEntryId).annotate({
    description:
      'Id of the ledger entry that undid this action, or null if still in effect.'
  }),
  undoes: Schema.NullOr(LedgerEntryId).annotate({
    description:
      'For an undo action, the id of the entry it reverses; otherwise null.'
  }),
  createdAt: Schema.String.annotate({
    description: 'ISO-8601 UTC timestamp the action was recorded.'
  })
}) {}

/** A sensitive action paused awaiting human approval. */
export class ApprovalRequest extends Schema.Class<ApprovalRequest>(
  'ApprovalRequest'
)({
  id: ApprovalId,
  emailId: EmailId,
  action: ActionKind,
  actionRevision: Schema.Number.annotate({
    description: 'Revision number of the action.'
  }),
  summary: Schema.String.annotate({
    description: 'What the agent proposes to do if approved.'
  }),
  payload: Schema.Record(Schema.String, Schema.Unknown).annotate({
    description: 'Proposed tool arguments (e.g. the draft reply body).'
  }),
  createdAt: Schema.String.annotate({
    description: 'ISO-8601 UTC timestamp the approval was requested.'
  })
}) {}

/** Approve or deny decision on a pending approval. */
export const ApprovalVerdict: Schema.Literals<readonly ['approve', 'deny']> =
  Schema.Literals(['approve', 'deny']).annotate({
    identifier: 'ApprovalVerdict',
    description: 'Human verdict on a pending sensitive action.'
  });

/** Request body for resolving a pending approval. */
export class ApprovalDecisionRequest extends Schema.Class<ApprovalDecisionRequest>(
  'ApprovalDecisionRequest'
)({
  verdict: ApprovalVerdict,
  editedBody: Schema.optional(Schema.String).annotate({
    description:
      'Optional edited reply body to send instead of the agent draft on approve.'
  })
}) {}
