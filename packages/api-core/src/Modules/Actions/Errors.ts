import { Schema } from 'effect';
import { ApprovalId, LedgerEntryId } from './Domain';

/** No pending approval exists for the requested id. */
export class ApprovalNotFound extends Schema.TaggedErrorClass<ApprovalNotFound>()(
  'ApprovalNotFound',
  {
    approvalId: ApprovalId
  },
  { httpApiStatus: 404 }
) {}

/** The approval was already resolved and cannot be resolved again. */
export class ApprovalAlreadyResolved extends Schema.TaggedErrorClass<ApprovalAlreadyResolved>()(
  'ApprovalAlreadyResolved',
  {
    approvalId: ApprovalId
  },
  { httpApiStatus: 409 }
) {}

/** No ledger entry exists for the requested id. */
export class ActionNotFound extends Schema.TaggedErrorClass<ActionNotFound>()(
  'ActionNotFound',
  {
    entryId: LedgerEntryId
  },
  { httpApiStatus: 404 }
) {}

/** The action cannot be undone (already undone or not reversible). */
export class ActionNotUndoable extends Schema.TaggedErrorClass<ActionNotUndoable>()(
  'ActionNotUndoable',
  {
    entryId: LedgerEntryId,
    reason: Schema.optional(Schema.String)
  },
  { httpApiStatus: 409 }
) {}
