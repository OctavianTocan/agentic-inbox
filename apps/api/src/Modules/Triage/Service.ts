import {
  ApprovalRequest,
  type LedgerEntry
} from '@app/api-core/Modules/Actions/Domain';
import type { Email, EmailStatus } from '@app/api-core/Modules/Emails/Domain';
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
import { TriageRun } from '@app/api-core/Modules/Triage/Runs/Domain';
import { Context, Effect, Layer, Schema, Stream } from 'effect';
import { Prompt } from 'effect/unstable/ai';
import { AppConfig } from '@/Infrastructure/AppConfig';
import type { EmailIdType, RunIdType } from '@/Lib/Ids';
import { ActionService, ActionServiceLive } from '@/Modules/Actions/Service';
import { AgentService, AgentServiceLive } from '@/Modules/Agent/Service';
import {
  type ConversationRecord,
  ConversationsRepo,
  ConversationsRepoLive
} from '@/Modules/Chat/Repo';
import { EmailsService, EmailsServiceLive } from '@/Modules/Emails/Service';
import { DecisionsRepo, DecisionsRepoLive } from './Decisions/Repo';
import { TriageRunsRepo, TriageRunsRepoLive } from './Runs/Repo';

type EmailStatusType = Schema.Schema.Type<typeof EmailStatus>;
type TriageEvent = Schema.Schema.Type<typeof TriageStreamEvent>;

/** True when Vitest is driving the process (skip batch pacing defaults). */
const underVitest =
  process.env.VITEST !== undefined && process.env.VITEST.length > 0;

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
  | TriageRunsRepo
> = Layer.effect(
  TriageService,
  Effect.gen(function* () {
    const agent = yield* AgentService;
    const emails = yield* EmailsService;
    const decisions = yield* DecisionsRepo;
    const actions = yield* ActionService;
    const conversations = yield* ConversationsRepo;
    const runs = yield* TriageRunsRepo;
    const { triageConcurrency: rawConcurrency, triageGapMs: configuredGap } =
      yield* AppConfig.pipe(Effect.orDie);
    const triageConcurrency = Math.max(1, rawConcurrency);
    // Under Vitest skip pacing unless TRIAGE_GAP_MS is explicitly set.
    const triageGapMs = underVitest
      ? process.env.TRIAGE_GAP_MS !== undefined &&
        process.env.TRIAGE_GAP_MS.length > 0
        ? Math.max(0, configuredGap)
        : 0
      : Math.max(0, configuredGap);

    /** Triage one email and persist its decision (shared by batch + retriage). */
    const persistTriage = Effect.fn('TriageService.persistTriage')(function* (
      email: Email
    ) {
      const result = yield* agent.triageEmail(email);
      const storedDecision = yield* decisions.upsert(result.decision);
      return {
        decision: storedDecision,
        actions: result.actions,
        approval: result.approval
      } as const;
    });

    /** One email for the batch stream: persist triage and map to SSE events. */
    const triageOneEmail = Effect.fn('TriageService.triageOneEmail')(function* (
      email: Email
    ): Effect.fn.Return<TriageEvent[]> {
      // Create a new run for the email.
      const runId = crypto.randomUUID() as RunIdType;
      yield* runs.create(
        new TriageRun({
          id: runId,
          emailId: email.id,
          status: 'running',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          proposal: 'send_reply',
          proposalSummary: 'Send reply',
          pending: null,
          decisionSnapshot: null,
          policyVersion: null,
          promptVersion: null
        })
      );

      const outcome = yield* persistTriage(email).pipe(
        Effect.map((ok) => ({ _tag: 'Ok' as const, ...ok })),
        Effect.catch((error) =>
          Effect.succeed({
            _tag: 'Fail' as const,
            reason: errorMessage(error)
          })
        )
      );

      if (outcome._tag === 'Fail') {
        return [
          new TriageStarted({ type: 'started', emailId: email.id }),
          new TriageFailed({
            type: 'failed',
            emailId: email.id,
            reason: outcome.reason
          })
        ];
      }

      const { decision, actions: acted, approval } = outcome;

      return [
        new TriageStarted({ type: 'started', emailId: email.id }),
        new TriageDecided({ type: 'decision', decision }),
        ...acted,
        ...(approval === null
          ? []
          : [
              new TriageApprovalPending({
                type: 'approval_pending',
                approval
              })
            ])
      ];
    });

    /** Pace then triage one email (batch concurrency entry point). */
    const triageEmailWithGap = Effect.fn('TriageService.triageEmailWithGap')(
      function* (email: Email, index: number): Effect.fn.Return<TriageEvent[]> {
        if (index > 0 && triageGapMs > 0) {
          yield* Effect.sleep(`${triageGapMs} millis`);
        }
        return yield* triageOneEmail(email);
      }
    );

    const run = Effect.fn('TriageService.run')(function* (fresh = false) {
      if (fresh) {
        yield* decisions.deleteAll();
        yield* actions.clearLedger();
        yield* conversations.deleteTriage();
        yield* runs.deleteAll();
      }
      const all = yield* emails.list();
      const existing = yield* decisions.list();
      const existingIds = new Set(existing.map((decision) => decision.emailId));
      const emailsToProcess = all.filter((email) => !existingIds.has(email.id));

      return Stream.fromIterable(emailsToProcess).pipe(
        Stream.mapEffect(triageEmailWithGap, {
          concurrency: triageConcurrency
        }),
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

      yield* persistTriage(email).pipe(Effect.orDie);

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
  ConversationsRepoLive,
  TriageRunsRepoLive
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
      actionRevision: 1,
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
