import { Schema } from 'effect';
import {
  HttpApiEndpoint,
  HttpApiGroup,
  HttpApiSchema,
  OpenApi
} from 'effect/unstable/httpapi';
import { EmailNotFound } from '../Emails/Errors';
import { TriageRunRequest } from './Domain';
import { TriageRunFailed } from './Errors';
import { TriageStreamEvent } from './Events';
import { Inbox } from './Inbox';

/** Triage endpoints: run the batch agent and read the joined inbox. */
export class TriageApi extends HttpApiGroup.make('triage')
  .add(
    HttpApiEndpoint.post('run', '/triage/run', {
      payload: TriageRunRequest,
      success: HttpApiSchema.StreamSse({
        data: TriageStreamEvent,
        error: TriageRunFailed
      }),
      error: TriageRunFailed
    })
      .annotate(OpenApi.Summary, 'Run batch triage')
      .annotate(
        OpenApi.Description,
        'Process the inbox and stream per-email events (started, decision, action, approval_pending, failed, done) as Server-Sent Events. Pass fresh=true to clear all prior triage state and re-process every email.'
      )
  )
  .add(
    HttpApiEndpoint.get('inbox', '/inbox', {
      success: Inbox
    })
      .annotate(OpenApi.Summary, 'Get the inbox')
      .annotate(
        OpenApi.Description,
        'Return the summary roll-up and every email joined with its decision, status, pending approval, and actions.'
      )
  )
  .add(
    HttpApiEndpoint.post('retriage', '/triage/:id/retriage', {
      params: { id: Schema.String },
      success: Inbox,
      error: EmailNotFound
    })
      .annotate(OpenApi.Summary, 'Re-triage one email')
      .annotate(
        OpenApi.Description,
        "Clear one email's decision, active ledger entries, and triage conversation, re-run the agent on just that email, and return the refreshed inbox."
      )
  ) {}
