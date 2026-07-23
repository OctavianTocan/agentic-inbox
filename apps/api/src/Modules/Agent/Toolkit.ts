import {
  ActionKind,
  LedgerEntryId
} from '@app/api-core/Modules/Actions/Domain';
import {
  ActionNotFound,
  ActionNotUndoable
} from '@app/api-core/Modules/Actions/Errors';
import { EmailId } from '@app/api-core/Modules/Emails/Domain';
import { Category, Severity } from '@app/api-core/Modules/Triage/Domain';
import { type Context, Effect, Schema } from 'effect';
import { Tool, Toolkit } from 'effect/unstable/ai';
import type {
  ActorType,
  CategoryType,
  LedgerEntryIdType,
  RunIdType
} from '@/Lib/Ids';
import type { ActionService } from '@/Modules/Actions/Service';
import type { EmailsService } from '@/Modules/Emails/Service';

const ToolEntryResult = Schema.Struct({ entryId: LedgerEntryId });
const ToolDecisionResult = Schema.Struct({ recorded: Schema.Boolean });

const RecordTriageParams = Schema.Struct({
  emailId: EmailId,
  category: Category,
  severity: Severity,
  confidence: Schema.Number,
  whyPreview: Schema.String,
  rationale: Schema.String,
  keyFacts: Schema.Array(Schema.String),
  isSensitive: Schema.Boolean
});

const SendReplyParams = Schema.Struct({
  emailId: EmailId,
  body: Schema.String,
  summary: Schema.optionalKey(Schema.String)
});

const FileParams = Schema.Struct({
  emailId: EmailId,
  summary: Schema.String
});

const UndoParams = Schema.Struct({
  entryId: LedgerEntryId
});

/**
 * Acknowledges the Classification before action tools.
 * Persistence is owned by InboxOrchestrator — this tool does not upsert.
 */
export const RecordTriage = Tool.make('record_triage', {
  description:
    'Acknowledge the triage decision before taking any other action on an email. Does not persist; the orchestrator writes the classification.',
  parameters: RecordTriageParams,
  success: ToolDecisionResult
}).annotate(Tool.Strict, true);

/** Sends a simulated plain-text email reply. */
export const SendReply = Tool.make('send_reply', {
  description:
    'Send a concise plain-text reply. Do not use for sensitive commitments unless approval has been granted.',
  parameters: SendReplyParams,
  success: ToolEntryResult,
  needsApproval: true
}).annotate(Tool.Strict, true);

/** Files an email as handled with no reply. */
export const Archive = Tool.make('archive', {
  description: 'Archive an email that needs no human action and no reply.',
  parameters: FileParams,
  success: ToolEntryResult,
  needsApproval: true
}).annotate(Tool.Strict, true);

/**
 * The gate that decides whether a triage action pauses for human approval.
 *
 * @param sensitive - The deterministic policy verdict for the email under triage.
 * @returns True when the action must pause for approval; false when it may execute autonomously.
 */
export const triageActionNeedsApproval = (sensitive: boolean): boolean =>
  sensitive;

/** Leaves an email for human review without sending or committing anything. */
export const FlagForReview = Tool.make('flag_for_review', {
  description:
    'Flag an email for human review. Use this for sensitive, disputed, safety, owner, or low-confidence work.',
  parameters: FileParams,
  success: ToolEntryResult
}).annotate(Tool.Strict, true);

/** Reverses a previous simulated action. */
export const Undo = Tool.make('undo', {
  description:
    'Undo a previous send_reply, archive, or flag_for_review action.',
  parameters: UndoParams,
  success: ToolEntryResult,
  failure: Schema.Union([ActionNotFound, ActionNotUndoable]),
  needsApproval: true
}).annotate(Tool.Strict, true);

/** Searches the fixed inbox by subject and body keyword. */
export const SearchEmails = Tool.make('search_emails', {
  description: 'Search emails by a case-insensitive keyword.',
  parameters: Schema.Struct({ query: Schema.String }),
  success: Schema.Array(
    Schema.Struct({
      id: EmailId,
      from: Schema.String,
      subject: Schema.String
    })
  )
}).annotate(Tool.Strict, true);

/** Fetches a full email by id. */
export const GetEmail = Tool.make('get_email', {
  description: 'Fetch one email by id.',
  parameters: Schema.Struct({ emailId: EmailId }),
  success: Schema.NullOr(
    Schema.Struct({
      id: EmailId,
      from: Schema.String,
      subject: Schema.String,
      body: Schema.String,
      timestamp: Schema.String
    })
  )
}).annotate(Tool.Strict, true);

/** Fetches an email thread by any email id in the thread. */
export const GetThread = Tool.make('get_thread', {
  description: 'Fetch an email and its replies, oldest first.',
  parameters: Schema.Struct({ emailId: EmailId }),
  success: Schema.Array(
    Schema.Struct({
      id: EmailId,
      from: Schema.String,
      subject: Schema.String,
      body: Schema.String
    })
  )
}).annotate(Tool.Strict, true);

/** Lists ledger entries, optionally for one email. */
export const ListLedger = Tool.make('list_ledger', {
  description: 'List recent action ledger entries.',
  parameters: Schema.Struct({
    emailId: Schema.optionalKey(Schema.NullOr(EmailId))
  }),
  success: Schema.Array(
    Schema.Struct({
      id: LedgerEntryId,
      emailId: EmailId,
      action: ActionKind,
      summary: Schema.String,
      createdAt: Schema.String
    })
  )
}).annotate(Tool.Strict, true);

/** The batch agent toolset. */
export const TriageToolkit = Toolkit.make(
  RecordTriage,
  SendReply,
  Archive,
  FlagForReview
);

/**
 * Builds a triage toolset whose send/archive tools pause for approval only
 * when the current email is sensitive, so routine work executes autonomously.
 *
 * @param sensitive - The deterministic policy verdict for the email under triage.
 * @returns A toolkit with the same tool shape as {@link TriageToolkit}.
 */
export const makeTriageToolkit = (sensitive: boolean): typeof TriageToolkit => {
  const gatedSendReply = Tool.make('send_reply', {
    description:
      'Send a concise plain-text reply. Do not use for sensitive commitments unless approval has been granted.',
    parameters: SendReplyParams,
    success: ToolEntryResult,
    needsApproval: () => triageActionNeedsApproval(sensitive)
  }).annotate(Tool.Strict, true);
  const gatedArchive = Tool.make('archive', {
    description: 'Archive an email that needs no human action and no reply.',
    parameters: FileParams,
    success: ToolEntryResult,
    needsApproval: () => triageActionNeedsApproval(sensitive)
  }).annotate(Tool.Strict, true);
  return Toolkit.make(
    RecordTriage,
    gatedSendReply,
    gatedArchive,
    FlagForReview
  );
};

/** The chat agent toolset. */
export const ChatToolkit = Toolkit.make(
  RecordTriage,
  SendReply,
  Archive,
  FlagForReview,
  Undo,
  SearchEmails,
  GetEmail,
  GetThread,
  ListLedger
);

/**
 * Builds handlers for the batch agent's mutating tools.
 *
 * @param actions - LedgerService (ActionService) for ledger appends.
 * @param actor - Actor stamped on ledger rows.
 * @param runId - Attempt id threaded into ledger rows for triage walks.
 */
export const makeTriageHandlers = (
  actions: Context.Service.Shape<typeof ActionService>,
  actor: ActorType,
  runId?: RunIdType
): Toolkit.HandlersFrom<typeof TriageToolkit.tools> =>
  TriageToolkit.of({
    // Acknowledgment only — InboxOrchestrator persists Classification.
    record_triage: () => Effect.succeed({ recorded: true }),
    send_reply: (params) =>
      actions
        .sendReply({
          emailId: params.emailId,
          actor,
          body: params.body,
          summary: params.summary,
          runId
        })
        .pipe(Effect.map((entry) => ({ entryId: entry.id }))),
    archive: (params) =>
      actions
        .archive({
          emailId: params.emailId,
          actor,
          summary: params.summary,
          runId
        })
        .pipe(Effect.map((entry) => ({ entryId: entry.id }))),
    flag_for_review: (params) =>
      actions
        .flagForReview({
          emailId: params.emailId,
          actor,
          summary: params.summary,
          runId
        })
        .pipe(Effect.map((entry) => ({ entryId: entry.id })))
  });

/** Builds handlers for the chat agent's read and mutating tools. */
export const makeChatHandlers = (
  actions: Context.Service.Shape<typeof ActionService>,
  emails: Context.Service.Shape<typeof EmailsService>,
  actor: ActorType
): Toolkit.HandlersFrom<typeof ChatToolkit.tools> =>
  ChatToolkit.of({
    ...makeTriageHandlers(actions, actor),
    undo: (params) =>
      actions
        .undoAction(params.entryId, actor)
        .pipe(Effect.map((entry) => ({ entryId: entry.id }))),
    search_emails: (params) =>
      emails.list().pipe(
        Effect.map((all) => {
          const query = params.query.toLowerCase();
          return all
            .filter(
              (email) =>
                email.subject.toLowerCase().includes(query) ||
                email.body.toLowerCase().includes(query)
            )
            .map((email) => ({
              id: email.id,
              from: email.from,
              subject: email.subject
            }));
        })
      ),
    get_email: (params) =>
      emails.get(params.emailId).pipe(
        Effect.map((email) =>
          email === null
            ? null
            : {
                id: email.id,
                from: email.from,
                subject: email.subject,
                body: email.body,
                timestamp: email.timestamp
              }
        )
      ),
    get_thread: (params) =>
      emails.thread(params.emailId).pipe(
        Effect.map((thread) =>
          thread.map((email) => ({
            id: email.id,
            from: email.from,
            subject: email.subject,
            body: email.body
          }))
        )
      ),
    list_ledger: (params) =>
      actions.listLedger(params.emailId ?? undefined).pipe(
        Effect.map((entries) =>
          entries.map((entry) => ({
            id: entry.id,
            emailId: entry.emailId,
            action: entry.action,
            summary: entry.summary,
            createdAt: entry.createdAt
          }))
        )
      )
  });

/** Converts a category to a typed category value for helper callers. */
export const categoryValue = (category: CategoryType): CategoryType => category;

/** Converts a ledger id to the shared id type for helper callers. */
export const ledgerEntryIdValue = (
  entryId: LedgerEntryIdType
): LedgerEntryIdType => entryId;
