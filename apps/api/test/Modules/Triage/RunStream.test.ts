import {
  type Email,
  Email as EmailSchema
} from '@app/api-core/Modules/Emails/Domain';
import { Decision } from '@app/api-core/Modules/Triage/Domain';
import type { TriageStreamEvent } from '@app/api-core/Modules/Triage/Events';
import { Effect, Layer, type Schema, Stream } from 'effect';
import { LanguageModel, type Prompt } from 'effect/unstable/ai';
import { describe, expect, it } from 'vitest';
import type { EmailIdType } from '@/Lib/Ids';
import { ActionLedgerRepo, ActionLedgerRepoBody } from '@/Modules/Actions/Repo';
import { ActionServiceBody } from '@/Modules/Actions/Service';
import { ToolModel, TriageModel } from '@/Modules/Agent/Model';
import { AgentServiceBody } from '@/Modules/Agent/Service';
import { ConversationsRepoBody } from '@/Modules/Chat/Repo';
import { EmailsService } from '@/Modules/Emails/Service';
import {
  DecisionsRepo,
  DecisionsRepoBody
} from '@/Modules/Triage/Decisions/Repo';
import { TriageRunsRepo, TriageRunsRepoBody } from '@/Modules/Triage/Runs/Repo';
import { TriageService, TriageServiceBody } from '@/Modules/Triage/Service';
import { runDb } from '../../support/Database';
import {
  type GenerateTextScript,
  hasToolResult,
  makeLanguageModelFake,
  textPart,
  toolCallPart
} from '../../support/LanguageModelFake';

type TriageEvent = Schema.Schema.Type<typeof TriageStreamEvent>;

const routineDecisionJson = JSON.stringify({
  emailId: 'placeholder',
  category: 'activity_update',
  severity: 'low',
  confidence: 0.95,
  whyPreview: 'Activity update needs no reply',
  rationale: 'An activity update is informational; archive it.',
  keyFacts: ['activity update'],
  isSensitive: false,
  policyReasons: []
});

const sensitiveDecisionJson = JSON.stringify({
  emailId: 'placeholder',
  category: 'safety',
  severity: 'high',
  confidence: 0.95,
  whyPreview: 'Safety incident needs a human',
  rationale: 'A safety incident carries legal exposure; defer to the human.',
  keyFacts: ['safety'],
  isSensitive: true,
  policyReasons: []
});

/** A routine email whose body carries no dollar, legal, safety, or escalation signal. */
const routineEmailFor = (id: EmailIdType): Email =>
  new EmailSchema({
    id,
    from: 'Sam Builder <sam@example.com>',
    to: ['pm@example.com'],
    cc: [],
    subject: `Studio update ${id}`,
    body: 'Crew poured the north footings and cleaned the staging area.',
    timestamp: '2026-05-01T12:00:00Z',
    inReplyTo: null
  });

/** A sensitive email that trips the deterministic policy on its category alone. */
const sensitiveEmailFor = (id: EmailIdType): Email =>
  new EmailSchema({
    id,
    from: 'Customer <customer@example.com>',
    to: ['pm@example.com'],
    cc: [],
    subject: `Billing request ${id}`,
    body: 'We need to formally change the lobby scope before proceeding.',
    timestamp: '2026-05-01T12:00:00Z',
    inReplyTo: null
  });

/** A routine tool script: record triage, then archive; a text turn closes the loop after the archive runs. */
const archiveScript: GenerateTextScript = (prompt) =>
  hasToolResult(prompt)
    ? [textPart('Filed the report.')]
    : [
        toolCallPart({
          id: 'call-archive',
          name: 'archive',
          params: { emailId: emailIdFromPrompt(prompt), summary: 'File report' }
        })
      ];

/** A sensitive tool script: a send_reply the gate turns into a pending approval. */
const sensitiveSendScript: GenerateTextScript = (prompt) => [
  toolCallPart({
    id: 'call-send',
    name: 'send_reply',
    params: {
      emailId: emailIdFromPrompt(prompt),
      body: 'Proposed billing response for your review.'
    }
  })
];

/** Recovers the email id the tool loop is acting on from the action prompt text so each script targets the current email. */
const emailIdFromPrompt = (prompt: Prompt.Prompt): string => {
  for (const message of prompt.content) {
    for (const part of message.content) {
      if (typeof part === 'string' || part.type !== 'text') {
        continue;
      }
      const match = part.text.match(/emailId:\s*(e-[\w-]+)/);
      if (match?.[1] !== undefined) {
        return match[1];
      }
    }
  }
  return 'e-unknown';
};

const emailsLayerFor = (emails: ReadonlyArray<Email>) =>
  Layer.succeed(EmailsService, {
    list: () => Effect.succeed(emails),
    get: (id: EmailIdType) =>
      Effect.succeed(emails.find((email) => email.id === id) ?? null),
    thread: (id: EmailIdType) =>
      Effect.succeed(emails.filter((email) => email.id === id))
  });

/** Rebinds the scripted fake under both model roles, using the given structured-decision JSON. */
const modelLayers = (
  script: GenerateTextScript,
  decisionJson: string
): Layer.Layer<TriageModel | ToolModel> => {
  const fake = makeLanguageModelFake({ generateText: script, decisionJson });
  return Layer.mergeAll(
    Layer.effect(TriageModel, LanguageModel.LanguageModel).pipe(
      Layer.provide(fake)
    ),
    Layer.effect(ToolModel, LanguageModel.LanguageModel).pipe(
      Layer.provide(fake)
    )
  );
};

/** Assembles the real `TriageService` over the real agent and test repos, driven by the scripted fake. */
const triageLayer = (options: {
  readonly emails: ReadonlyArray<Email>;
  readonly script: GenerateTextScript;
  readonly decisionJson: string;
}) => {
  const dependencies = Layer.mergeAll(
    ActionServiceBody.pipe(Layer.provideMerge(ActionLedgerRepoBody)),
    DecisionsRepoBody,
    ConversationsRepoBody,
    TriageRunsRepoBody,
    emailsLayerFor(options.emails),
    modelLayers(options.script, options.decisionJson)
  );
  const agent = AgentServiceBody.pipe(Layer.provide(dependencies));
  return TriageServiceBody.pipe(
    Layer.provideMerge(Layer.mergeAll(agent, dependencies))
  );
};

/** Groups the flat event stream by email in arrival order, keyed by the started event that opened each. */
const eventsByEmail = (
  events: ReadonlyArray<TriageEvent>
): Map<string, ReadonlyArray<TriageEvent['type']>> => {
  const grouped = new Map<string, TriageEvent['type'][]>();
  let currentId: string | null = null;
  for (const event of events) {
    if (event.type === 'started') {
      currentId = event.emailId;
      grouped.set(currentId, ['started']);
      continue;
    }
    if (event.type === 'done' || currentId === null) {
      continue;
    }
    grouped.get(currentId)?.push(event.type);
  }
  return grouped;
};

describe('TriageService.run SSE ordering (real agent, fake models)', () => {
  it('emits started then decision then the action event per routine email, and done.processed equals the untriaged count', async () => {
    // skips already-triaged mail and reports only the remaining count as done.
    const emailIds: readonly EmailIdType[] = ['e-run-1', 'e-run-2', 'e-run-3'];
    const emails = emailIds.map(routineEmailFor);

    const result = await runDb(
      Effect.gen(function* () {
        const triage = yield* TriageService;
        const decisions = yield* DecisionsRepo;
        yield* decisions.upsert(
          new Decision({
            emailId: 'e-run-1',
            category: 'activity_update',
            severity: 'low',
            confidence: 0.95,
            whyPreview: 'already decided',
            rationale: 'Seeded so the run skips it.',
            keyFacts: [],
            isSensitive: false,
            policyReasons: []
          })
        );
        const stream = yield* triage.run();
        const collected = yield* Stream.runCollect(stream);
        return [...collected];
      }).pipe(
        Effect.provide(
          triageLayer({
            emails,
            script: archiveScript,
            decisionJson: routineDecisionJson
          })
        )
      )
    );

    const processed = result
      .filter((event) => event.type === 'done')
      .map((event) => (event.type === 'done' ? event.processed : -1));
    expect(processed).toEqual([2]);

    const startedIds = result
      .filter((event) => event.type === 'started')
      .map((event) => (event.type === 'started' ? event.emailId : ''))
      .sort();
    expect(startedIds).toEqual(['e-run-2', 'e-run-3']);

    const grouped = eventsByEmail(result);
    for (const id of ['e-run-2', 'e-run-3']) {
      expect(grouped.get(id)).toEqual(['started', 'decision', 'action']);
    }

    // The action event must carry the archive the routine loop executed, not
    // just any action, so the ordering test also proves the right tool ran.
    const archived = result.filter(
      (event) => event.type === 'action' && event.entry.action === 'archive'
    );
    expect(archived).toHaveLength(2);
    // Triage ledger rows must carry the Attempt id minted by InboxOrchestrator.
    for (const event of archived) {
      if (event.type === 'action') {
        expect(event.entry.runId).not.toBeNull();
      }
    }
  });

  it('persists completed Attempts whose id matches ledger runId for executed actions', async () => {
    const email = routineEmailFor('e-run-attempt-1');

    const result = await runDb(
      Effect.gen(function* () {
        const triage = yield* TriageService;
        const runs = yield* TriageRunsRepo;
        const ledger = yield* ActionLedgerRepo;
        const stream = yield* triage.run();
        yield* Stream.runCollect(stream);
        const attemptRows = yield* runs.listByEmail(email.id);
        const ledgerRows = yield* ledger.listByEmail(email.id);
        return { attemptRows, ledgerRows };
      }).pipe(
        Effect.provide(
          triageLayer({
            emails: [email],
            script: archiveScript,
            decisionJson: routineDecisionJson
          })
        )
      )
    );

    expect(result.attemptRows).toHaveLength(1);
    expect(result.attemptRows[0]?.status).toBe('completed');
    expect(result.attemptRows[0]?.proposal).toBe('archive');
    expect(result.ledgerRows).toHaveLength(1);
    expect(result.ledgerRows[0]?.runId).toBe(result.attemptRows[0]?.id);
  });

  it('emits started then decision then approval_pending for a sensitive email', async () => {
    const email = sensitiveEmailFor('e-sensitive-1');

    const result = await runDb(
      Effect.gen(function* () {
        const triage = yield* TriageService;
        const runs = yield* TriageRunsRepo;
        const stream = yield* triage.run();
        const collected = yield* Stream.runCollect(stream);
        const attemptRows = yield* runs.listByEmail(email.id);
        return { events: [...collected], attemptRows };
      }).pipe(
        Effect.provide(
          triageLayer({
            emails: [email],
            script: sensitiveSendScript,
            decisionJson: sensitiveDecisionJson
          })
        )
      )
    );

    const grouped = eventsByEmail(result.events);
    expect(grouped.get('e-sensitive-1')).toEqual([
      'started',
      'decision',
      'approval_pending'
    ]);
    expect(result.attemptRows).toHaveLength(1);
    expect(result.attemptRows[0]?.status).toBe('interrupted');
    expect(result.attemptRows[0]?.pending?.action).toBe('send_reply');
  });

  it('fresh=true clears prior decisions and reprocesses every email', async () => {
    const emailIds: readonly EmailIdType[] = ['e-fresh-a', 'e-fresh-b'];
    const emails = emailIds.map(routineEmailFor);

    const result = await runDb(
      Effect.gen(function* () {
        const triage = yield* TriageService;
        const decisions = yield* DecisionsRepo;
        yield* decisions.upsert(
          new Decision({
            emailId: 'e-fresh-a',
            category: 'activity_update',
            severity: 'low',
            confidence: 0.95,
            whyPreview: 'stale decision',
            rationale: 'A non-fresh run would skip this email.',
            keyFacts: [],
            isSensitive: false,
            policyReasons: []
          })
        );
        const stream = yield* triage.run(true);
        const collected = yield* Stream.runCollect(stream);
        const decidedIds = (yield* decisions.list())
          .map((decision) => decision.emailId)
          .sort();
        return { events: [...collected], decidedIds };
      }).pipe(
        Effect.provide(
          triageLayer({
            emails,
            script: archiveScript,
            decisionJson: routineDecisionJson
          })
        )
      )
    );

    const processed = result.events
      .filter((event) => event.type === 'done')
      .map((event) => (event.type === 'done' ? event.processed : -1));
    expect(processed).toEqual([2]);
    expect(result.decidedIds).toEqual(['e-fresh-a', 'e-fresh-b']);
  });
});
