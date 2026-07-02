import { Schema } from 'effect';
import { ApprovalRequest, LedgerEntry } from '../Actions/Domain';
import { Email, EmailStatus } from '../Emails/Domain';
import { Decision } from './Domain';

/** An email joined with its triage decision, status, and pending state for the inbox view. */
export class InboxItem extends Schema.Class<InboxItem>('InboxItem')({
  email: Email,
  status: EmailStatus,
  decision: Schema.NullOr(Decision).annotate({
    description:
      'The agent verdict, or null if this email has not been triaged yet.'
  }),
  pendingApproval: Schema.NullOr(ApprovalRequest).annotate({
    description:
      'A sensitive action awaiting approval, or null when none is pending.'
  }),
  actions: Schema.Array(LedgerEntry).annotate({
    description: 'Ledger entries recorded for this email, newest first.'
  })
}) {}

/** Roll-up counts across the whole inbox for the summary block. */
export class InboxSummary extends Schema.Class<InboxSummary>('InboxSummary')({
  processed: Schema.Number.annotate({
    description: 'Emails the agent has triaged.'
  }),
  handled: Schema.Number.annotate({
    description: 'Emails auto-handled for the user.'
  }),
  needsAttention: Schema.Number.annotate({
    description: 'Emails awaiting the user.'
  }),
  filed: Schema.Number.annotate({ description: 'Emails archived.' })
}) {}

/** Full inbox payload: summary plus the joined item list. */
export class Inbox extends Schema.Class<Inbox>('Inbox')({
  summary: InboxSummary,
  items: Schema.Array(InboxItem)
}) {}
