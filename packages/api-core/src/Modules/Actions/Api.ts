import { Schema } from 'effect';
import {
  HttpApiEndpoint,
  HttpApiGroup,
  OpenApi
} from 'effect/unstable/httpapi';
import {
  ApprovalDecisionRequest,
  ApprovalId,
  LedgerEntry,
  LedgerEntryId
} from './Domain';
import {
  ActionNotFound,
  ActionNotUndoable,
  ApprovalAlreadyResolved,
  ApprovalNotFound
} from './Errors';

/** Action endpoints: resolve approvals, undo executed actions, read the ledger. */
export class ActionsApi extends HttpApiGroup.make('actions')
  .add(
    HttpApiEndpoint.post('resolveApproval', '/approvals/:id', {
      params: { id: ApprovalId },
      payload: ApprovalDecisionRequest,
      success: LedgerEntry,
      error: [
        ApprovalNotFound,
        ApprovalAlreadyResolved,
        ActionNotFound,
        ActionNotUndoable
      ]
    })
      .annotate(OpenApi.Summary, 'Resolve an approval')
      .annotate(
        OpenApi.Description,
        'Approve or deny a paused sensitive action, resuming the agent and recording the outcome in the ledger.'
      )
  )
  .add(
    HttpApiEndpoint.post('undo', '/actions/:id/undo', {
      params: { id: LedgerEntryId },
      success: LedgerEntry,
      error: [ActionNotFound, ActionNotUndoable]
    })
      .annotate(OpenApi.Summary, 'Undo an action')
      .annotate(
        OpenApi.Description,
        'Reverse an auto-executed action; appends an undo entry to the ledger and returns it.'
      )
  )
  .add(
    HttpApiEndpoint.get('ledger', '/ledger', {
      success: Schema.Array(LedgerEntry)
    })
      .annotate(OpenApi.Summary, 'Get the action ledger')
      .annotate(
        OpenApi.Description,
        'Return every recorded action, newest first, for the agent-trace timeline.'
      )
  ) {}
