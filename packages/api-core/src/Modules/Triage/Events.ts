import { Schema } from 'effect';
import { ApprovalRequest, LedgerEntry } from '../Actions/Domain';
import { EmailId } from '../Emails/Domain';
import { Classification } from './Domain';

/** The agent began processing an email. */
export class TriageStarted extends Schema.Class<TriageStarted>('TriageStarted')(
  {
    type: Schema.tag('started'),
    emailId: EmailId
  }
) {}

/** The agent recorded its verdict for an email. */
export class TriageDecided extends Schema.Class<TriageDecided>('TriageDecided')(
  {
    type: Schema.tag('decision'),
    classification: Classification
  }
) {}

/** The agent auto-executed an action for a routine email. */
export class TriageActed extends Schema.Class<TriageActed>('TriageActed')({
  type: Schema.tag('action'),
  entry: LedgerEntry
}) {}

/** A sensitive email paused for human approval. */
export class TriageApprovalPending extends Schema.Class<TriageApprovalPending>(
  'TriageApprovalPending'
)({
  type: Schema.tag('approval_pending'),
  approval: ApprovalRequest
}) {}

/** Processing an email failed and was isolated from the run. */
export class TriageFailed extends Schema.Class<TriageFailed>('TriageFailed')({
  type: Schema.tag('failed'),
  emailId: EmailId,
  reason: Schema.String
}) {}

/** The whole run finished. */
export class TriageRunDone extends Schema.Class<TriageRunDone>('TriageRunDone')(
  {
    type: Schema.tag('done'),
    processed: Schema.Number.annotate({
      description: 'Count of emails processed.'
    })
  }
) {}

/** A single event in the triage-run SSE stream. */
export const TriageStreamEvent: Schema.Union<
  readonly [
    typeof TriageStarted,
    typeof TriageDecided,
    typeof TriageActed,
    typeof TriageApprovalPending,
    typeof TriageFailed,
    typeof TriageRunDone
  ]
> = Schema.Union([
  TriageStarted,
  TriageDecided,
  TriageActed,
  TriageApprovalPending,
  TriageFailed,
  TriageRunDone
]).annotate({
  identifier: 'TriageStreamEvent',
  description: 'Discriminated event emitted over the triage-run SSE stream.'
});
