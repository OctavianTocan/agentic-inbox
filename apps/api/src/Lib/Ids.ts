import type {
  ActionKind,
  Actor,
  ApprovalId,
  LedgerEntryId,
  RunId
} from '@app/api-core/Modules/Actions/Domain';
import type { EmailId } from '@app/api-core/Modules/Emails/Domain';
import type { Category, Severity } from '@app/api-core/Modules/Triage/Domain';
import type { TriageRunStatus } from '@app/api-core/Modules/Triage/Runs/Domain';
import type { Schema } from 'effect';

/** Dataset email identifier (`e-001`..`e-080`). */
export type EmailIdType = Schema.Schema.Type<typeof EmailId>;

/** Ledger-entry identifier. */
export type LedgerEntryIdType = Schema.Schema.Type<typeof LedgerEntryId>;

/** Run identifier. */
export type RunIdType = Schema.Schema.Type<typeof RunId>;

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

/** Triage run status. */
export type TriageRunStatusType = Schema.Schema.Type<typeof TriageRunStatus>;
