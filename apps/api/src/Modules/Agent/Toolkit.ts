import type { Email } from '@app/api-core/Modules/Emails/Domain';
import { type Context, Effect, type Layer, Schema } from 'effect';
import { Tool, Toolkit } from 'effect/unstable/ai';
import type { ActorType, EmailIdType } from '@/Lib/Ids';
import { ActionService } from '@/Modules/Actions/Service';
import { EmailsService } from '@/Modules/Emails/Service';

const EmailIdParam = Schema.String.annotate({
  description: 'Target email id such as `e-001`.'
});

/**
 * Builds the `send_reply` tool. `needsApproval` is set at construction so the
 * batch agent can gate it on the deterministic policy verdict while chat always
 * gates it; there is no ungated send variant by design.
 */
const makeSendReply = (needsApproval: boolean) =>
  Tool.make('send_reply', {
    description:
      'Draft and send a plain-text reply to the sender. Sensitive emails require human approval before this executes.',
    parameters: Schema.Struct({
      emailId: EmailIdParam,
      body: Schema.String.annotate({
        description: 'The full plain-text reply body to send.'
      })
    }),
    success: Schema.Struct({ sent: Schema.Boolean, entryId: Schema.String }),
    needsApproval
  }).annotate(Tool.Strict, true);

/** Builds the `archive` tool, gated on approval when the email is sensitive. */
const makeArchive = (needsApproval: boolean) =>
  Tool.make('archive', {
    description:
      'File an email away as handled with no reply needed (e.g. an FYI or daily report).',
    parameters: Schema.Struct({
      emailId: EmailIdParam,
      summary: Schema.String.annotate({
        description: 'One-line note on why this was filed.'
      })
    }),
    success: Schema.Struct({
      archived: Schema.Boolean,
      entryId: Schema.String
    }),
    needsApproval
  }).annotate(Tool.Strict, true);

const FlagForReview = Tool.make('flag_for_review', {
  description:
    'Leave an email for the human to handle, without sending anything. Use for sensitive matters you must not act on.',
  parameters: Schema.Struct({
    emailId: EmailIdParam,
    summary: Schema.String.annotate({
      description: 'One-line note on what the human needs to decide.'
    })
  }),
  success: Schema.Struct({ flagged: Schema.Boolean, entryId: Schema.String })
}).annotate(Tool.Strict, true);

const SearchEmails = Tool.make('search_emails', {
  description:
    'Search the inbox by a case-insensitive keyword over subject and body.',
  parameters: Schema.Struct({
    query: Schema.String.annotate({
      description: 'Keyword to match against subject and body.'
    })
  }),
  success: Schema.Array(
    Schema.Struct({
      id: Schema.String,
      from: Schema.String,
      subject: Schema.String
    })
  )
}).annotate(Tool.Strict, true);

const GetEmail = Tool.make('get_email', {
  description: 'Fetch one email in full by its id.',
  parameters: Schema.Struct({ emailId: EmailIdParam }),
  success: Schema.Struct({
    id: Schema.String,
    from: Schema.String,
    subject: Schema.String,
    body: Schema.String,
    timestamp: Schema.String
  }),
  failure: Schema.Struct({ notFound: Schema.Boolean })
}).annotate(Tool.Strict, true);

const GetThread = Tool.make('get_thread', {
  description:
    'Fetch an email and every reply in its thread, oldest first, by any id in the thread.',
  parameters: Schema.Struct({ emailId: EmailIdParam }),
  success: Schema.Array(
    Schema.Struct({
      id: Schema.String,
      from: Schema.String,
      subject: Schema.String,
      body: Schema.String
    })
  )
}).annotate(Tool.Strict, true);

const ListLedger = Tool.make('list_ledger', {
  description:
    'List recent actions the agents and user have taken, newest first, for context.',
  parameters: Schema.Struct({ emailId: Schema.optional(EmailIdParam) }),
  success: Schema.Array(
    Schema.Struct({
      id: Schema.String,
      emailId: Schema.String,
      action: Schema.String,
      summary: Schema.String,
      createdAt: Schema.String
    })
  )
}).annotate(Tool.Strict, true);

/** The three mutating tools every agent shares, gated per the caller's policy verdict. */
type MutatingTools = {
  readonly send_reply: ReturnType<typeof makeSendReply>;
  readonly archive: ReturnType<typeof makeArchive>;
  readonly flag_for_review: typeof FlagForReview;
};

/** The chat agent's tools: the mutating three plus read-only inbox lookups. */
type ChatTools = MutatingTools & {
  readonly search_emails: typeof SearchEmails;
  readonly get_email: typeof GetEmail;
  readonly get_thread: typeof GetThread;
  readonly list_ledger: typeof ListLedger;
};

/**
 * Mutating toolkit for the batch triage agent, gated on the deterministic
 * policy verdict. A sensitive email can never auto-execute a send: no ungated
 * send tool exists.
 *
 * @param isSensitive - Whether the policy classified this email as sensitive.
 * @returns A toolkit whose send/archive require approval iff sensitive.
 */
export const makeTriageToolkit = (
  isSensitive: boolean
): Toolkit.Toolkit<MutatingTools> =>
  Toolkit.make(
    makeSendReply(isSensitive),
    makeArchive(isSensitive),
    FlagForReview
  );

/** Read + mutating tools for the interactive chat agent; every mutation gates on approval. */
export const ChatToolkit: Toolkit.Toolkit<ChatTools> = Toolkit.make(
  makeSendReply(true),
  makeArchive(true),
  FlagForReview,
  SearchEmails,
  GetEmail,
  GetThread,
  ListLedger
);

const projectFull = (email: Email) => ({
  id: email.id,
  from: email.from,
  subject: email.subject,
  body: email.body,
  timestamp: email.timestamp
});

/** Mutating-tool handlers bound to one actor; reused by both toolkits. */
const mutatingHandlers = (
  actor: ActorType,
  actions: Context.Service.Shape<typeof ActionService>
) => ({
  send_reply: (params: { readonly emailId: string; readonly body: string }) =>
    actions
      .sendReply({
        emailId: params.emailId as EmailIdType,
        actor,
        body: params.body
      })
      .pipe(Effect.map((entry) => ({ sent: true, entryId: entry.id }))),
  archive: (params: { readonly emailId: string; readonly summary: string }) =>
    actions
      .archive({
        emailId: params.emailId as EmailIdType,
        actor,
        summary: params.summary
      })
      .pipe(Effect.map((entry) => ({ archived: true, entryId: entry.id }))),
  flag_for_review: (params: {
    readonly emailId: string;
    readonly summary: string;
  }) =>
    actions
      .flagForReview({
        emailId: params.emailId as EmailIdType,
        actor,
        summary: params.summary
      })
      .pipe(Effect.map((entry) => ({ flagged: true, entryId: entry.id })))
});

/** Handler layer for a triage toolkit; every mutation is attributed to the batch agent. */
export const TriageToolkitLayer = (
  isSensitive: boolean
): Layer.Layer<Tool.HandlersFor<MutatingTools>, never, ActionService> =>
  makeTriageToolkit(isSensitive).toLayer(
    Effect.gen(function* () {
      const actions = yield* ActionService;
      return mutatingHandlers('batch_agent', actions);
    })
  );

/** Handler layer for the chat toolkit, wiring reads to the dataset and mutations to the chat agent. */
export const ChatToolkitLayer: Layer.Layer<
  Tool.HandlersFor<ChatTools>,
  never,
  ActionService | EmailsService
> = ChatToolkit.toLayer(
  Effect.gen(function* () {
    const emails = yield* EmailsService;
    const actions = yield* ActionService;

    return {
      ...mutatingHandlers('chat_agent', actions),
      search_emails: (params: { readonly query: string }) =>
        emails.list().pipe(
          Effect.map((all) => {
            const needle = params.query.toLowerCase();
            return all
              .filter(
                (email) =>
                  email.subject.toLowerCase().includes(needle) ||
                  email.body.toLowerCase().includes(needle)
              )
              .map((email) => ({
                id: email.id,
                from: email.from,
                subject: email.subject
              }));
          })
        ),
      get_email: (params: { readonly emailId: string }) =>
        emails
          .get(params.emailId as EmailIdType)
          .pipe(
            Effect.flatMap((email) =>
              email === null
                ? Effect.fail({ notFound: true })
                : Effect.succeed(projectFull(email))
            )
          ),
      get_thread: (params: { readonly emailId: string }) =>
        emails.thread(params.emailId as EmailIdType).pipe(
          Effect.map((thread) =>
            thread.map((email) => ({
              id: email.id,
              from: email.from,
              subject: email.subject,
              body: email.body
            }))
          )
        ),
      list_ledger: (params: { readonly emailId?: string | undefined }) =>
        actions
          .listLedger(
            params.emailId === undefined
              ? undefined
              : (params.emailId as EmailIdType)
          )
          .pipe(
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
    };
  })
);
