import {
  ApprovalRequest,
  type LedgerEntry
} from '@app/api-core/Modules/Actions/Domain';
import type { EmailStatus } from '@app/api-core/Modules/Emails/Domain';
import { EmailNotFound } from '@app/api-core/Modules/Emails/Errors';
import type { Decision } from '@app/api-core/Modules/Triage/Domain';
import {
  TriageApprovalPending,
  TriageDecided,
  TriageFailed,
  TriageRunDone,
  TriageStarted,
  type TriageStreamEvent
} from '@app/api-core/Modules/Triage/Events';
import {
  Inbox,
  InboxItem,
  InboxSummary
} from '@app/api-core/Modules/Triage/Inbox';
import { Context, Effect, Layer, Schema, Stream } from 'effect';
import { Prompt } from 'effect/unstable/ai';
import type { EmailIdType } from '@/Lib/Ids';
import { ActionService, ActionServiceLive } from '@/Modules/Actions/Service';
import { AgentService, AgentServiceLive } from '@/Modules/Agent/Service';
import {
  type ConversationRecord,
  ConversationsRepo,
  ConversationsRepoLive
} from '@/Modules/Chat/Repo';
import { EmailsService, EmailsServiceLive } from '@/Modules/Emails/Service';
import { DecisionsRepo, DecisionsRepoLive } from './Repo';

type EmailStatusType = Schema.Schema.Type<typeof EmailStatus>;
type TriageEvent = Schema.Schema.Type<typeof TriageStreamEvent>;

/** Orchestrates batch triage and joined inbox reads. */
export class TriageService extends Context.Service<
  TriageService,
  {
    readonly run: (
      fresh?: boolean
    ) => Effect.Effect<Stream.Stream<TriageEvent, never>, never>;
    readonly retriage: (
      emailId: EmailIdType
    ) => Effect.Effect<Inbox, EmailNotFound>;
    readonly inbox: () => Effect.Effect<Inbox>;
  }
>()('@apps/api/Triage/TriageService') {}

/** `TriageService` without its dependencies; use {@link TriageServiceLive}. */
export const TriageServiceBody: Layer.Layer<
  TriageService,
  never,
  | AgentService
  | EmailsService
  | DecisionsRepo
  | ActionService
  | ConversationsRepo
> = Layer.effect(
  TriageService,
  Effect.gen(function* () {
    const agent = yield* AgentService;
    const emails = yield* EmailsService;
    const decisions = yield* DecisionsRepo;
    const actions = yield* ActionService;
    const conversations = yield* ConversationsRepo;

    const run = Effect.fn('TriageService.run')(function* (fresh = false) {
      if (fresh) {
        yield* decisions.deleteAll();
        yield* actions.clearLedger();
        yield* conversations.deleteTriage();
      }
      const all = yield* emails.list();
      const existing = yield* decisions.list();
      const existingIds = new Set(existing.map((decision) => decision.emailId));
      const emailsToProcess = all.filter((email) => !existingIds.has(email.id));

      return Stream.fromIterable(emailsToProcess).pipe(
        Stream.mapEffect(
          (email) =>
            agent.triageEmail(email).pipe(
              Effect.flatMap(({ decision, actions: acted, approval }) =>
                decisions.upsert(decision).pipe(
                  Effect.map((storedDecision): TriageEvent[] => [
                    new TriageStarted({
                      type: 'started',
                      emailId: email.id
                    }),
                    new TriageDecided({
                      type: 'decision',
                      decision: storedDecision
                    }),
                    ...acted,
                    ...(approval === null
                      ? []
                      : [
                          new TriageApprovalPending({
                            type: 'approval_pending',
                            approval
                          })
                        ])
                  ])
                )
              ),
              Effect.catch((error) =>
                Effect.succeed<TriageEvent[]>([
                  new TriageStarted({ type: 'started', emailId: email.id }),
                  new TriageFailed({
                    type: 'failed',
                    emailId: email.id,
                    reason: errorMessage(error)
                  })
                ])
              )
            ),
          { concurrency: 24, unordered: true }
        ),
        Stream.flatMap((events) => Stream.fromIterable(events)),
        Stream.concat(
          Stream.succeed(
            new TriageRunDone({
              type: 'done',
              processed: emailsToProcess.length
            })
          )
        )
      );
    });

    const inbox = Effect.fn('TriageService.inbox')(function* () {
      const all = yield* emails.list();
      const decisionRows = yield* decisions.list();
      const ledger = yield* actions.listLedger();
      const awaiting = yield* conversations.listAwaitingApproval();
      const decisionByEmail = new Map(
        decisionRows.map((decision) => [decision.emailId, decision] as const)
      );
      const items = all.map((email) => {
        const decision = decisionByEmail.get(email.id) ?? null;
        const emailActions = ledger.filter(
          (entry) => entry.emailId === email.id
        );
        const pendingApproval = findApprovalForEmail(email.id, awaiting);
        return new InboxItem({
          email,
          status: statusForItem(decision, pendingApproval, emailActions),
          decision,
          pendingApproval,
          actions: emailActions
        });
      });
      return new Inbox({
        summary: summaryForItems(items),
        items
      });
    });

    const retriage = Effect.fn('TriageService.retriage')(function* (
      emailId: EmailIdType
    ) {
      const email = yield* emails.get(emailId);
      if (email === null) {
        return yield* Effect.fail(new EmailNotFound({ emailId }));
      }

      yield* decisions.deleteByEmail(emailId);
      yield* actions.clearLedgerForEmail(emailId);
      yield* conversations.deleteByEmail(emailId);

      const { decision } = yield* agent.triageEmail(email).pipe(Effect.orDie);
      yield* decisions.upsert(decision);

      return yield* inbox();
    });

    return { run, retriage, inbox } as const;
  })
);

/** Production `TriageService` backed by Postgres repos and the shared agent. */
export const TriageServiceLive = Layer.provide(TriageServiceBody, [
  AgentServiceLive,
  EmailsServiceLive,
  DecisionsRepoLive,
  ActionServiceLive,
  ConversationsRepoLive
]);

/** Computes the current review status for an inbox item. */
const statusForItem = (
  decision: Decision | null,
  approval: ApprovalRequest | null,
  actions: ReadonlyArray<LedgerEntry>
): EmailStatusType => {
  if (approval !== null || decision === null) {
    return 'needs_attention';
  }
  const activeFlag = actions.some(
    (entry) => entry.action === 'flag_for_review' && entry.undoneBy === null
  );
  if (activeFlag) {
    return 'needs_attention';
  }
  const activeArchive = actions.some(
    (entry) => entry.action === 'archive' && entry.undoneBy === null
  );
  if (activeArchive) {
    return 'filed';
  }
  const activeAction = actions.some(
    (entry) => entry.action !== 'undo' && entry.undoneBy === null
  );
  return activeAction ? 'done_for_you' : 'needs_attention';
};

/** Builds roll-up counts for the inbox summary. */
const summaryForItems = (items: ReadonlyArray<InboxItem>): InboxSummary =>
  new InboxSummary({
    processed: items.filter((item) => item.decision !== null).length,
    handled: items.filter((item) => item.status === 'done_for_you').length,
    needsAttention: items.filter((item) => item.status === 'needs_attention')
      .length,
    filed: items.filter((item) => item.status === 'filed').length
  });

/** Finds a pending approval object already materialized by the agent service. */
const findApprovalForEmail = (
  emailId: EmailIdType,
  conversations: ReadonlyArray<ConversationRecord>
): ApprovalRequest | null => {
  for (const conversation of conversations) {
    if (conversation.emailId !== emailId || conversation.pending === null) {
      continue;
    }
    const prompt = Schema.decodeUnknownSync(Prompt.Prompt)(conversation.prompt);
    const toolCall = findToolCall(prompt, conversation.pending.toolCallId);
    const payload = toRecord(toolCall?.params);
    return new ApprovalRequest({
      id: conversation.pending.approvalId,
      emailId,
      action: actionFromToolName(toolCall?.name),
      summary: summaryFromToolCall(toolCall?.name, payload),
      payload,
      createdAt: conversation.createdAt
    });
  }
  return null;
};

/** Converts unknown failures into a stream-safe reason. */
const errorMessage = (error: unknown): string => {
  if (error instanceof Error) {
    return error.message;
  }
  return 'triage failed';
};

/** Finds a tool call in a prompt by id. */
const findToolCall = (
  prompt: Prompt.Prompt,
  toolCallId: string
): { readonly name: string; readonly params: unknown } | null => {
  for (const message of prompt.content) {
    if (message.role !== 'assistant') {
      continue;
    }
    for (const part of message.content) {
      if (
        part.type === 'tool-call' &&
        part.id === toolCallId &&
        typeof part.name === 'string'
      ) {
        return { name: part.name, params: part.params };
      }
    }
  }
  return null;
};

/** Converts a tool name into an action kind accepted by the approval card. */
const actionFromToolName = (
  name: string | undefined
): ApprovalRequest['action'] => {
  if (
    name === 'send_reply' ||
    name === 'archive' ||
    name === 'flag_for_review' ||
    name === 'undo'
  ) {
    return name;
  }
  return 'flag_for_review';
};

/** Builds a short human label for a pending tool call. */
const summaryFromToolCall = (
  name: string | undefined,
  payload: Readonly<Record<string, unknown>>
): string => {
  const summary = stringField(payload, 'summary');
  if (summary !== null) {
    return summary;
  }
  if (name === 'send_reply') {
    return 'Send drafted reply';
  }
  if (name === 'archive') {
    return 'Archive email';
  }
  if (name === 'undo') {
    return 'Undo action';
  }
  return 'Needs human review';
};

/** Returns a record view for object-like tool params. */
const toRecord = (value: unknown): Record<string, unknown> => {
  if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
    return Object.fromEntries(Object.entries(value));
  }
  return {};
};

/** Reads a string field from a record. */
const stringField = (
  record: Readonly<Record<string, unknown>>,
  key: string
): string | null => {
  const value = record[key];
  return typeof value === 'string' ? value : null;
};
