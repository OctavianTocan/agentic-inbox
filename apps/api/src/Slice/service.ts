import {
  type ActionKind as ActionKindSchema,
  type Actor as ActorSchema,
  type ApprovalDecisionRequest,
  ApprovalRequest,
  LedgerEntry
} from '@app/api-core/Modules/Actions/Domain';
import {
  ActionNotFound,
  ActionNotUndoable,
  ApprovalAlreadyResolved,
  ApprovalNotFound
} from '@app/api-core/Modules/Actions/Errors';
import {
  type Email,
  EmailFromDataset,
  type EmailStatus as EmailStatusSchema
} from '@app/api-core/Modules/Emails/Domain';
import { Decision } from '@app/api-core/Modules/Triage/Domain';
import {
  TriageActed,
  TriageApprovalPending,
  TriageDecided,
  TriageFailed,
  TriageRunDone,
  TriageStarted
} from '@app/api-core/Modules/Triage/Events';
import {
  Inbox,
  InboxItem,
  InboxSummary
} from '@app/api-core/Modules/Triage/Inbox';
import { Context, Effect, Layer, Ref, Schema, Stream } from 'effect';
import { Prompt } from 'effect/unstable/ai';
import { SliceDatasetError } from './errors';
import { decisionPrompt, generateDecision } from './model';
import { requiresApproval } from './policy';

type PendingApproval = {
  readonly request: ApprovalRequest;
  readonly toolCallId: string;
  readonly encodedPrompt: unknown;
};

type SliceState = {
  readonly decisions: ReadonlyMap<string, Decision>;
  readonly ledger: readonly LedgerEntry[];
  readonly pendingApprovals: ReadonlyMap<string, PendingApproval>;
  readonly resolvedApprovals: ReadonlySet<string>;
};

type EmailStatusValue = typeof EmailStatusSchema.Type;
type ActionKindValue = typeof ActionKindSchema.Type;
type ActorValue = typeof ActorSchema.Type;

type TriageEvent =
  | TriageStarted
  | TriageDecided
  | TriageActed
  | TriageApprovalPending
  | TriageFailed
  | TriageRunDone;

/** In-memory backend for the take-home insurance slice. */
export class Slice extends Context.Service<Slice>()('@apps/api/Slice', {
  make: Effect.gen(function* () {
    const emails = yield* loadDataset;
    const state = yield* Ref.make<SliceState>({
      decisions: new Map(),
      ledger: [],
      pendingApprovals: new Map(),
      resolvedApprovals: new Set()
    });

    const listInbox = Effect.fn('Slice.listInbox')(function* () {
      const snapshot = yield* Ref.get(state);
      const items = emails.map((email) => makeInboxItem(email, snapshot));
      return new Inbox({
        summary: makeSummary(items),
        items
      });
    });

    const listLedger = Effect.fn('Slice.listLedger')(function* () {
      const snapshot = yield* Ref.get(state);
      return orderLedger(snapshot.ledger);
    });

    const runTriage = Effect.fn('Slice.runTriage')(
      function* (): Effect.fn.Return<Stream.Stream<TriageEvent>, never, never> {
        const eventStreams = emails.map((email) =>
          Stream.fromEffect(processEmail(email)).pipe(
            Stream.flatMap(Stream.fromIterable)
          )
        );
        return Stream.fromIterable(eventStreams).pipe(
          Stream.flatten({ concurrency: 8 }),
          Stream.concat(
            Stream.succeed(new TriageRunDone({ processed: emails.length }))
          )
        );
      }
    );

    const resolveApproval = Effect.fn('Slice.resolveApproval')(function* (
      approvalId: string,
      input: ApprovalDecisionRequest
    ) {
      const pending = yield* getPendingApproval(state, approvalId);
      yield* decodeApprovalPrompt(pending, input);
      if (input.verdict === 'deny') {
        return yield* resolveDeniedApproval(state, pending);
      }

      return yield* resolveApprovedApproval(state, pending, input);
    });

    const undoAction = Effect.fn('Slice.undoAction')(function* (
      entryId: string
    ) {
      const snapshot = yield* Ref.get(state);
      const result = yield* undoFromSnapshot(snapshot, entryId);
      yield* Ref.set(state, result.state);
      return result.entry;
    });

    const processEmail = Effect.fn('Slice.processEmail')(function* (
      email: Email
    ): Effect.fn.Return<readonly TriageEvent[], never, never> {
      return yield* Effect.gen(function* () {
        const decision = yield* generateDecision(decisionPrompt(email));
        const normalized = normalizeDecision(email, decision);
        yield* Ref.update(state, (snapshot) => ({
          ...snapshot,
          decisions: new Map(snapshot.decisions).set(email.id, normalized)
        }));

        const shouldPause = requiresApproval(email, normalized);
        if (shouldPause) {
          const approval = makeApproval(email, normalized);
          yield* Ref.update(state, (snapshot) => ({
            ...snapshot,
            pendingApprovals: new Map(snapshot.pendingApprovals).set(
              approval.request.id,
              approval
            )
          }));
          return [
            new TriageStarted({ emailId: email.id }),
            new TriageDecided({ decision: normalized }),
            new TriageApprovalPending({ approval: approval.request })
          ];
        }

        const entry = makeActionEntry({
          actor: 'batch_agent',
          email,
          action: chooseRoutineAction(normalized),
          payload: makeRoutinePayload(normalized),
          summary: makeRoutineSummary(normalized)
        });
        yield* Ref.update(state, (snapshot) => ({
          ...snapshot,
          ledger: [...snapshot.ledger, entry]
        }));
        return [
          new TriageStarted({ emailId: email.id }),
          new TriageDecided({ decision: normalized }),
          new TriageActed({ entry })
        ];
      }).pipe(
        Effect.catch((error) =>
          Effect.succeed([
            new TriageStarted({ emailId: email.id }),
            new TriageFailed({
              emailId: email.id,
              reason: error instanceof Error ? error.message : 'triage failed'
            })
          ])
        )
      );
    });

    return {
      listInbox,
      listLedger,
      runTriage,
      resolveApproval,
      undoAction
    };
  })
}) {
  static readonly layer = Layer.effect(this, this.make);
}

/** Loads and decodes the static email fixture once for the Slice service. */
const loadDataset: Effect.Effect<readonly Email[], SliceDatasetError> =
  Effect.tryPromise({
    try: async () => {
      const raw = await Bun.file(
        new URL('../../../../data/emails.json', import.meta.url)
      ).text();
      return Schema.decodeUnknownSync(Schema.Array(EmailFromDataset))(
        JSON.parse(raw)
      );
    },
    catch: (error) =>
      new SliceDatasetError({
        detail: error instanceof Error ? error.message : 'Unknown dataset error'
      })
  });

/** Builds one joined inbox row from immutable state. */
function makeInboxItem(email: Email, state: SliceState): InboxItem {
  const decision = state.decisions.get(email.id) ?? null;
  const pendingApproval = findPendingApproval(email.id, state);
  const actions = orderLedger(
    state.ledger.filter((entry) => entry.emailId === email.id)
  );
  return new InboxItem({
    email,
    status: statusForItem(decision, pendingApproval, actions),
    decision,
    pendingApproval,
    actions
  });
}

/** Counts inbox buckets for the summary block. */
function makeSummary(items: readonly InboxItem[]): InboxSummary {
  return new InboxSummary({
    processed: items.filter((item) => item.decision !== null).length,
    handled: items.filter((item) => item.status === 'done_for_you').length,
    needsAttention: items.filter((item) => item.status === 'needs_attention')
      .length,
    filed: items.filter((item) => item.status === 'filed').length
  });
}

/** Computes the current review bucket for one inbox row. */
function statusForItem(
  decision: Decision | null,
  pendingApproval: ApprovalRequest | null,
  actions: readonly LedgerEntry[]
): EmailStatusValue {
  if (pendingApproval !== null) {
    return 'needs_attention';
  }

  if (decision === null) {
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
}

/** Finds the pending approval for an email, if one exists. */
function findPendingApproval(
  emailId: string,
  state: SliceState
): ApprovalRequest | null {
  for (const pending of state.pendingApprovals.values()) {
    if (pending.request.emailId === emailId) {
      return pending.request;
    }
  }

  return null;
}

/** Returns newest ledger entries first. */
function orderLedger(entries: readonly LedgerEntry[]): readonly LedgerEntry[] {
  return [...entries].sort((left, right) =>
    right.createdAt.localeCompare(left.createdAt)
  );
}

/** Normalizes model output against deterministic policy display constraints. */
function normalizeDecision(email: Email, decision: Decision): Decision {
  const confidence = Math.max(0, Math.min(1, decision.confidence));
  const whyPreview =
    decision.whyPreview.length > 65
      ? decision.whyPreview.slice(0, 65)
      : decision.whyPreview;
  return new Decision({
    ...decision,
    emailId: email.id,
    confidence,
    whyPreview,
    isSensitive: requiresApproval(
      email,
      new Decision({ ...decision, confidence, whyPreview })
    )
  });
}

/** Chooses the minimal simulated action for a routine decision. */
function chooseRoutineAction(decision: Decision): ActionKindValue {
  if (
    decision.category === 'daily_report' ||
    decision.category === 'status_update'
  ) {
    return 'archive';
  }

  return 'send_reply';
}

/** Builds simulated tool payload for a routine action. */
function makeRoutinePayload(decision: Decision): Record<string, unknown> {
  if (
    decision.category === 'daily_report' ||
    decision.category === 'status_update'
  ) {
    return { reason: decision.whyPreview };
  }

  return {
    body: `Thanks for the update. I have logged this and will follow up if the project team needs anything else.`
  };
}

/** Builds a one-line ledger summary for a routine action. */
function makeRoutineSummary(decision: Decision): string {
  if (
    decision.category === 'daily_report' ||
    decision.category === 'status_update'
  ) {
    return `Filed ${decision.category.replace('_', ' ')}: ${decision.whyPreview}`;
  }

  return `Sent routine ${decision.category.replace('_', ' ')} acknowledgment`;
}

/** Creates an approval request and encoded prompt checkpoint for a sensitive action. */
function makeApproval(email: Email, decision: Decision): PendingApproval {
  const id = `appr-${crypto.randomUUID()}`;
  const toolCallId = `call-${crypto.randomUUID()}`;
  const prompt = Prompt.make([
    {
      role: 'system',
      content:
        'Sensitive inbox actions pause until the PM approves or denies them.'
    },
    {
      role: 'user',
      content: `Email ${email.id}: ${email.subject}`
    },
    {
      role: 'assistant',
      content: `Approval requested for ${decision.category}: ${decision.rationale}`
    }
  ]);
  return {
    request: new ApprovalRequest({
      id,
      emailId: email.id,
      action: 'send_reply',
      summary: `Approval required: ${decision.whyPreview}`,
      payload: {
        body: `I received this and will review it before making any commitment.`
      },
      createdAt: new Date().toISOString()
    }),
    toolCallId,
    encodedPrompt: Schema.encodeSync(Prompt.Prompt)(prompt)
  };
}

/** Creates a ledger entry for a simulated tool execution. */
function makeActionEntry(input: {
  readonly actor: ActorValue;
  readonly email: Email;
  readonly action: ActionKindValue;
  readonly payload: Record<string, unknown>;
  readonly summary: string;
  readonly undoes?: string;
}): LedgerEntry {
  return new LedgerEntry({
    id: `act-${crypto.randomUUID()}`,
    actor: input.actor,
    emailId: input.email.id,
    action: input.action,
    summary: input.summary,
    payload: input.payload,
    undoneBy: null,
    undoes: input.undoes ?? null,
    createdAt: new Date().toISOString()
  });
}

/** Looks up a pending approval or maps the missing state to API errors. */
function getPendingApproval(
  state: Ref.Ref<SliceState>,
  approvalId: string
): Effect.Effect<PendingApproval, ApprovalNotFound | ApprovalAlreadyResolved> {
  return Effect.gen(function* () {
    const snapshot = yield* Ref.get(state);
    const pending = snapshot.pendingApprovals.get(approvalId);
    if (pending !== undefined) {
      return pending;
    }

    if (snapshot.resolvedApprovals.has(approvalId)) {
      return yield* Effect.fail(new ApprovalAlreadyResolved({ approvalId }));
    }

    return yield* Effect.fail(new ApprovalNotFound({ approvalId }));
  });
}

/** Decodes the stored Prompt checkpoint and appends the approval response. */
function decodeApprovalPrompt(
  pending: PendingApproval,
  input: ApprovalDecisionRequest
): Effect.Effect<unknown> {
  return Effect.sync(() => {
    const decoded = Schema.decodeUnknownSync(Prompt.Prompt)(
      pending.encodedPrompt
    );
    const response = Prompt.make([
      {
        role: 'tool',
        content: [
          {
            type: 'tool-approval-response',
            approvalId: pending.request.id,
            approved: input.verdict === 'approve'
          }
        ]
      }
    ]);
    return Schema.encodeSync(Prompt.Prompt)(Prompt.concat(decoded, response));
  });
}

/** Resolves an approval denial by recording user review instead of execution. */
function resolveDeniedApproval(
  state: Ref.Ref<SliceState>,
  pending: PendingApproval
): Effect.Effect<LedgerEntry> {
  return Ref.modify(state, (snapshot) => {
    const nextPending = new Map(snapshot.pendingApprovals);
    nextPending.delete(pending.request.id);
    const entry = new LedgerEntry({
      id: `act-${crypto.randomUUID()}`,
      actor: 'user',
      emailId: pending.request.emailId,
      action: 'flag_for_review',
      summary: `Denied approval: ${pending.request.summary}`,
      payload: { approvalId: pending.request.id },
      undoneBy: null,
      undoes: null,
      createdAt: new Date().toISOString()
    });
    return [
      entry,
      {
        ...snapshot,
        pendingApprovals: nextPending,
        resolvedApprovals: new Set(snapshot.resolvedApprovals).add(
          pending.request.id
        ),
        ledger: [...snapshot.ledger, entry]
      }
    ];
  });
}

/** Resolves an approval by executing the paused simulated action. */
function resolveApprovedApproval(
  state: Ref.Ref<SliceState>,
  pending: PendingApproval,
  input: ApprovalDecisionRequest
): Effect.Effect<LedgerEntry> {
  return Ref.modify(state, (snapshot) => {
    const nextPending = new Map(snapshot.pendingApprovals);
    nextPending.delete(pending.request.id);
    const payload =
      input.editedBody === undefined
        ? pending.request.payload
        : { ...pending.request.payload, body: input.editedBody };
    const entry = new LedgerEntry({
      id: `act-${crypto.randomUUID()}`,
      actor: 'user',
      emailId: pending.request.emailId,
      action: pending.request.action,
      summary: `Approved and executed: ${pending.request.summary}`,
      payload,
      undoneBy: null,
      undoes: null,
      createdAt: new Date().toISOString()
    });
    return [
      entry,
      {
        ...snapshot,
        pendingApprovals: nextPending,
        resolvedApprovals: new Set(snapshot.resolvedApprovals).add(
          pending.request.id
        ),
        ledger: [...snapshot.ledger, entry]
      }
    ];
  });
}

/** Applies undo semantics to a ledger snapshot. */
function undoFromSnapshot(
  snapshot: SliceState,
  entryId: string
): Effect.Effect<
  { readonly entry: LedgerEntry; readonly state: SliceState },
  ActionNotFound | ActionNotUndoable
> {
  const original = snapshot.ledger.find((entry) => entry.id === entryId);
  if (original === undefined) {
    return Effect.fail(new ActionNotFound({ entryId }));
  }

  if (original.action === 'undo') {
    return Effect.fail(
      new ActionNotUndoable({
        entryId,
        reason: 'Undo entries cannot be undone.'
      })
    );
  }

  if (original.undoneBy !== null) {
    return Effect.fail(
      new ActionNotUndoable({ entryId, reason: 'Action is already undone.' })
    );
  }

  const undoEntry = new LedgerEntry({
    id: `act-${crypto.randomUUID()}`,
    actor: 'user',
    emailId: original.emailId,
    action: 'undo',
    summary: `Undid ${original.action}: ${original.summary}`,
    payload: { targetEntryId: original.id },
    undoneBy: null,
    undoes: original.id,
    createdAt: new Date().toISOString()
  });
  const ledger = snapshot.ledger.map((entry) =>
    entry.id === original.id
      ? new LedgerEntry({ ...entry, undoneBy: undoEntry.id })
      : entry
  );
  return Effect.succeed({
    entry: undoEntry,
    state: { ...snapshot, ledger: [...ledger, undoEntry] }
  });
}
