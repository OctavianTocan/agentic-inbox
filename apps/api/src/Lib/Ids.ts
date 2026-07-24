import type {
  ActionKind,
  Actor,
  ApprovalId,
  AttemptId,
  LedgerEntryId
} from '@app/api-core/Modules/Actions/Domain';
import type { EmailId } from '@app/api-core/Modules/Emails/Domain';
import type { AttemptStatus } from '@app/api-core/Modules/Triage/Attempts/Domain';
import type { Category, Severity } from '@app/api-core/Modules/Triage/Domain';
import type { Schema } from 'effect';

/** Dataset email identifier (`e-001`..`e-080`). */
export type EmailIdType = Schema.Schema.Type<typeof EmailId>;

/** Ledger-entry identifier. */
export type LedgerEntryIdType = Schema.Schema.Type<typeof LedgerEntryId>;

/** Attempt identifier (wire: runId). */
export type AttemptIdType = Schema.Schema.Type<typeof AttemptId>;

/** Pending-approval identifier. */
export type ApprovalIdType = Schema.Schema.Type<typeof ApprovalId>;

/** Originator of an action. */
export type ActorType = Schema.Schema.Type<typeof Actor>;

/** Mutating tool executed for a ledger entry. */
export type ActionKindType = Schema.Schema.Type<typeof ActionKind>;

/** Triage category. */
export type CategoryType = Schema.Schema.Type<typeof Category>;

/** Email severity. */
export type SeverityType = Schema.Schema.Type<typeof Severity>;

/** Triage attempt status. */
export type AttemptStatusType = Schema.Schema.Type<typeof AttemptStatus>;
