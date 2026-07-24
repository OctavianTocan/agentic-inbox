import {
  ApprovalRequest,
  type LedgerEntry
} from '@app/api-core/Modules/Actions/Domain';
import type { Email, EmailStatus } from '@app/api-core/Modules/Emails/Domain';
import { EmailNotFound } from '@app/api-core/Modules/Emails/Errors';
import {
  Attempt,
  AttemptError,
  AttemptPending
} from '@app/api-core/Modules/Triage/Attempts/Domain';
import {
  Classification,
  type NextAction
} from '@app/api-core/Modules/Triage/Domain';
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
import { Context, DateTime, Effect, Layer, Schema, Stream } from 'effect';
import { Prompt } from 'effect/unstable/ai';
import { AppConfig } from '@/Infrastructure/AppConfig';
import type { AttemptIdType, EmailIdType } from '@/Lib/Ids';
import { LedgerService, LedgerServiceLive } from '@/Modules/Actions/Service';
import { TriageAgent, TriageAgentLive } from '@/Modules/Agent/TriageAgent';
import {
  type ConversationRecord,
  ConversationsRepo,
  ConversationsRepoLive
} from '@/Modules/Chat/Repo';
import { EmailsService, EmailsServiceLive } from '@/Modules/Emails/Service';
import { AttemptsRepo, AttemptsRepoLive } from './Attempts/Repo';
import {
  ClassificationsRepo,
  ClassificationsRepoLive
} from './Classifications/Repo';

type EmailStatusType = Schema.Schema.Type<typeof EmailStatus>;
type TriageEvent = Schema.Schema.Type<typeof TriageStreamEvent>;
type NextActionType = Schema.Schema.Type<typeof NextAction>;

const encodeClassification = Schema.encodeSync(Classification);
const decodeJson = Schema.decodeUnknownSync(Schema.Json);

/** True when Vitest is driving the process (skip batch pacing defaults). */
const underVitest =
  process.env.VITEST !== undefined && process.env.VITEST.length > 0;

/** Orchestrates batch triage and joined inbox reads. */
export class InboxOrchestrator extends Context.Service<
  InboxOrchestrator,
  {
    readonly run: (
      fresh?: boolean
    ) => Effect.Effect<Stream.Stream<TriageEvent, never>, never>;
    readonly retriage: (
      emailId: EmailIdType
    ) => Effect.Effect<Inbox, EmailNotFound>;
    readonly inbox: () => Effect.Effect<Inbox>;
  }
>()('@apps/api/Triage/InboxOrchestrator') {}

/** `InboxOrchestrator` without its dependencies; use {@link InboxOrchestratorLive}. */
export const InboxOrchestratorBody: Layer.Layer<
  InboxOrchestrator,
  never,
  | TriageAgent
  | EmailsService
  | ClassificationsRepo
  | LedgerService
  | ConversationsRepo
  | AttemptsRepo
> = Layer.effect(
  InboxOrchestrator,
  Effect.gen(function* () {
    const agent = yield* TriageAgent;
    const emails = yield* EmailsService;
    const classifications = yield* ClassificationsRepo;
    const actions = yield* LedgerService;
    const conversations = yield* ConversationsRepo;
    const attempts = yield* AttemptsRepo;
    const { triageConcurrency: rawConcurrency, triageGapMs: configuredGap } =
      yield* AppConfig.pipe(Effect.orDie);
    const triageConcurrency = Math.max(1, rawConcurrency);
    const triageGapMs = underVitest
      ? process.env.TRIAGE_GAP_MS !== undefined &&
        process.env.TRIAGE_GAP_MS.length > 0
        ? Math.max(0, configuredGap)
        : 0
      : Math.max(0, configuredGap);

    /** Triage one email and persist its Classification. */
    const persistTriage = Effect.fn('InboxOrchestrator.persistTriage')(
      function* (email: Email, attemptId: AttemptIdType) {
        const result = yield* agent.triageEmail(email, { runId: attemptId });
        const stored = yield* classifications.upsert(result.classification);
        return {
          classification: stored,
          actions: result.actions,
          approval: result.approval
        } as const;
      }
    );

    /** Mint an Attempt, walk TriageAgent, finalize status. */
    const runAttempt = Effect.fn('InboxOrchestrator.runAttempt')(function* (
      email: Email
    ) {
      const attemptId = crypto.randomUUID() as AttemptIdType;
      const now = yield* DateTime.now;
      const ts = DateTime.formatIso(now);
      yield* attempts.create(
        new Attempt({
          id: attemptId,
          emailId: email.id,
          status: 'running',
          createdAt: ts,
          updatedAt: ts,
          nextAction: 'no_action',
          proposalSummary: 'In progress',
          pending: null,
          decisionSnapshot: null,
          policyVersion: null,
          promptVersion: null,
          error: null
        })
      );

      const outcome = yield* persistTriage(email, attemptId).pipe(
        Effect.map((ok) => ({ _tag: 'Ok' as const, ...ok })),
        Effect.catch((error) =>
          Effect.succeed({
            _tag: 'Fail' as const,
            reason: errorMessage(error)
          })
        )
      );

      const updatedAt = DateTime.formatIso(yield* DateTime.now);

      if (outcome._tag === 'Fail') {
        yield* attempts.upsert(
          new Attempt({
            id: attemptId,
            emailId: email.id,
            status: 'failed',
            createdAt: ts,
            updatedAt,
            nextAction: 'no_action',
            proposalSummary: 'Triage failed',
            pending: null,
            decisionSnapshot: null,
            policyVersion: null,
            promptVersion: null,
            error: new AttemptError({ message: outcome.reason })
          })
        );
        return { _tag: 'Fail' as const, reason: outcome.reason, attemptId };
      }

      const { classification, actions: acted, approval } = outcome;
      const { nextAction, proposalSummary } = nextActionFromOutcome(
        acted,
        approval
      );
      const decisionSnapshot = decodeJson(encodeClassification(classification));

      if (approval !== null) {
        yield* attempts.upsert(
          new Attempt({
            id: attemptId,
            emailId: email.id,
            status: 'interrupted',
            createdAt: ts,
            updatedAt,
            nextAction,
            proposalSummary,
            pending: pendingFromApproval(approval),
            decisionSnapshot,
            policyVersion: null,
            promptVersion: null,
            error: null
          })
        );
      } else {
        yield* attempts.upsert(
          new Attempt({
            id: attemptId,
            emailId: email.id,
            status: 'completed',
            createdAt: ts,
            updatedAt,
            nextAction,
            proposalSummary,
            pending: null,
            decisionSnapshot,
            policyVersion: null,
            promptVersion: null,
            error: null
          })
        );
      }

      return {
        _tag: 'Ok' as const,
        attemptId,
        classification,
        actions: acted,
        approval
      };
    });

    const triageOneEmail = Effect.fn('InboxOrchestrator.triageOneEmail')(
      function* (email: Email): Effect.fn.Return<TriageEvent[]> {
        const outcome = yield* runAttempt(email);

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

        const { classification, actions: acted, approval } = outcome;

        return [
          new TriageStarted({ type: 'started', emailId: email.id }),
          new TriageDecided({ type: 'decision', classification }),
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
      }
    );

    const triageEmailWithGap = Effect.fn(
      'InboxOrchestrator.triageEmailWithGap'
    )(function* (email: Email, index: number): Effect.fn.Return<TriageEvent[]> {
      if (index > 0 && triageGapMs > 0) {
        yield* Effect.sleep(`${triageGapMs} millis`);
      }
      return yield* triageOneEmail(email);
    });

    const run = Effect.fn('InboxOrchestrator.run')(function* (fresh = false) {
      if (fresh) {
        yield* classifications.deleteAll();
        yield* actions.clearLedger();
        yield* conversations.deleteTriage();
        yield* attempts.deleteAll();
      }
      const all = yield* emails.list();
      const existing = yield* classifications.list();
      const existingIds = new Set(existing.map((row) => row.emailId));
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

    const inbox = Effect.fn('InboxOrchestrator.inbox')(function* () {
      const all = yield* emails.list();
      const classificationRows = yield* classifications.list();
      const ledger = yield* actions.listLedger();
      const awaiting = yield* conversations.listAwaitingApproval();
      const classificationByEmail = new Map(
        classificationRows.map(
          (classification) => [classification.emailId, classification] as const
        )
      );
      const items = all.map((email) => {
        const classification = classificationByEmail.get(email.id) ?? null;
        const emailActions = ledger.filter(
          (entry) => entry.emailId === email.id
        );
        const pendingApproval = findApprovalForEmail(email.id, awaiting);
        return new InboxItem({
          email,
          status: statusForItem(classification, pendingApproval, emailActions),
          classification,
          pendingApproval,
          actions: emailActions
        });
      });
      return new Inbox({
        summary: summaryForItems(items),
        items
      });
    });

    const retriage = Effect.fn('InboxOrchestrator.retriage')(function* (
      emailId: EmailIdType
    ) {
      const email = yield* emails.get(emailId);
      if (email === null) {
        return yield* Effect.fail(new EmailNotFound({ emailId }));
      }

      yield* classifications.deleteByEmail(emailId);
      yield* actions.clearLedgerForEmail(emailId);
      yield* conversations.deleteByEmail(emailId);

      const outcome = yield* runAttempt(email);
      if (outcome._tag === 'Fail') {
        return yield* Effect.die(new Error(outcome.reason));
      }

      return yield* inbox();
    });

    return { run, retriage, inbox } as const;
  })
);

/** Production `InboxOrchestrator` backed by Postgres repos and TriageAgent. */
export const InboxOrchestratorLive = Layer.provide(InboxOrchestratorBody, [
  TriageAgentLive,
  EmailsServiceLive,
  ClassificationsRepoLive,
  LedgerServiceLive,
  ConversationsRepoLive,
  AttemptsRepoLive
]);

/** Computes the current review status for an inbox item. */
const statusForItem = (
  classification: Classification | null,
  approval: ApprovalRequest | null,
  actions: ReadonlyArray<LedgerEntry>
): EmailStatusType => {
  if (approval !== null || classification === null) {
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
    processed: items.filter((item) => item.classification !== null).length,
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

/** Derives NextAction fields from agent outcomes. */
const nextActionFromOutcome = (
  acted: ReadonlyArray<{ readonly entry: LedgerEntry }>,
  approval: ApprovalRequest | null
): {
  readonly nextAction: NextActionType;
  readonly proposalSummary: string;
} => {
  if (approval !== null) {
    return {
      nextAction: nextActionFromLedgerAction(approval.action),
      proposalSummary: approval.summary
    };
  }
  const first = acted[0]?.entry;
  if (first !== undefined) {
    return {
      nextAction: nextActionFromLedgerAction(first.action),
      proposalSummary: first.summary
    };
  }
  return { nextAction: 'no_action', proposalSummary: 'No action' };
};

/** Maps a ledger/approval action kind onto the NextAction union. */
const nextActionFromLedgerAction = (
  action: LedgerEntry['action']
): NextActionType => {
  if (
    action === 'send_reply' ||
    action === 'archive' ||
    action === 'flag_for_review'
  ) {
    return action;
  }
  return 'flag_for_review';
};

/** Builds Attempt pending payload from a legacy ApprovalRequest. */
const pendingFromApproval = (approval: ApprovalRequest): AttemptPending =>
  new AttemptPending({
    action: approval.action,
    summary: approval.summary,
    payload: approval.payload,
    actionRevision: approval.actionRevision
  });

/** Converts unknown failures into a stream-safe reason. */
const errorMessage = (error: unknown): string => {
  if (error instanceof Error) {
    return error.message.length > 0 ? error.message : error.name;
  }
  if (typeof error === 'object' && error !== null && '_tag' in error) {
    const tag = error._tag;
    if (typeof tag === 'string') {
      return tag;
    }
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
