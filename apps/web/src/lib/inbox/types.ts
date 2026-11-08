/**
 * Wire types from `@app/api-core` — the single source of truth for inbox shapes.
 * `TriageRunEvent` stays local: it is a UI-narrowed SSE progress subset.
 */
import type {
  ActionKind as ActionKindSchema,
  Actor as ActorSchema,
  ApprovalRequest as ApprovalRequestSchema,
  LedgerEntry as LedgerEntrySchema
} from '@app/api-core/Modules/Actions/Domain';
import type {
  Email as EmailSchema,
  EmailStatus as EmailStatusSchema
} from '@app/api-core/Modules/Emails/Domain';
import type {
  Category as CategorySchema,
  Decision as DecisionSchema,
  Severity as SeveritySchema
} from '@app/api-core/Modules/Triage/Domain';
import type {
  InboxItem as InboxItemSchema,
  Inbox as InboxSchema,
  InboxSummary as InboxSummarySchema
} from '@app/api-core/Modules/Triage/Inbox';
import type { Schema } from 'effect';

export type EmailStatus = Schema.Schema.Type<typeof EmailStatusSchema>;
export type Category = Schema.Schema.Type<typeof CategorySchema>;
export type Severity = Schema.Schema.Type<typeof SeveritySchema>;
export type Actor = Schema.Schema.Type<typeof ActorSchema>;
export type ActionKind = Schema.Schema.Type<typeof ActionKindSchema>;
/** Human verdict when resolving a pending approval. */
export type ApprovalVerdict = 'approve' | 'deny';

export type Email = Schema.Schema.Type<typeof EmailSchema>;
export type Decision = Schema.Schema.Type<typeof DecisionSchema>;
export type LedgerEntry = Schema.Schema.Type<typeof LedgerEntrySchema>;
export type ApprovalRequest = Schema.Schema.Type<typeof ApprovalRequestSchema>;
export type InboxItem = Schema.Schema.Type<typeof InboxItemSchema>;
export type InboxSummary = Schema.Schema.Type<typeof InboxSummarySchema>;
export type Inbox = Schema.Schema.Type<typeof InboxSchema>;

/** Browser-facing subset of events emitted while the batch triage agent runs. */
export type TriageRunEvent =
  | {
      readonly type: 'started';
      readonly emailId: string;
    }
  | {
      readonly type: 'decision';
      readonly emailId: string;
    }
  | {
      readonly type: 'action';
      readonly emailId: string;
      readonly summary: string;
    }
  | {
      readonly type: 'approval_pending';
      readonly emailId: string;
      readonly summary: string;
    }
  | {
      readonly type: 'failed';
      readonly emailId: string;
      readonly reason: string;
    }
  | {
      readonly type: 'done';
      readonly processed: number;
    };
