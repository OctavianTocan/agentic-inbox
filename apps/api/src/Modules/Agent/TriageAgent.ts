import type { ApprovalRequest } from '@app/api-core/Modules/Actions/Domain';
import type {
  ActionNotFound,
  ActionNotUndoable
} from '@app/api-core/Modules/Actions/Errors';
import type { Email } from '@app/api-core/Modules/Emails/Domain';
import {
  Category,
  Classification,
  Confidence,
  Severity,
  WhyPreview
} from '@app/api-core/Modules/Triage/Domain';
import { TriageActed } from '@app/api-core/Modules/Triage/Events';
import { type Config, Context, Effect, Layer, Schema } from 'effect';
import { type AiError, LanguageModel, Prompt } from 'effect/unstable/ai';
import type { EmailIdType } from '@/Lib/Ids';
import { isSensitive } from '@/Modules/Actions/Policy';
import { LedgerService, LedgerServiceLive } from '@/Modules/Actions/Service';
import { ConversationsRepo, ConversationsRepoLive } from '@/Modules/Chat/Repo';
import {
  actedSince,
  approvalRequestFromPrompt,
  encodePrompt,
  type LoopResult,
  retrySchedule,
  runLoop,
  type TriageEmailOptions
} from './Loop';
import {
  ToolModel,
  ToolModelLive,
  TriageModel,
  TriageModelLive
} from './Model';
import {
  TRIAGE_SYSTEM_PROMPT,
  triageActionPrompt,
  triageDecisionPrompt
} from './Prompts';
import { makeTriageToolkit } from './Toolkit';

/**
 * Structured fields for triage `generateObject`.
 *
 * `emailId` is omitted — the caller already knows the email.
 */
const ClassificationFromModel = Schema.Struct({
  category: Schema.optionalKey(Category),
  severity: Schema.optionalKey(Severity),
  confidence: Schema.optionalKey(Confidence),
  whyPreview: Schema.optionalKey(WhyPreview),
  rationale: Schema.optionalKey(
    Schema.String.annotate({
      description:
        'Full plain-language explanation of the classification, rendered as markdown.'
    })
  ),
  keyFacts: Schema.optionalKey(
    Schema.Array(Schema.String).annotate({
      description:
        'Extracted salient facts the reviewer should see (amounts, dates, parties).'
    })
  ),
  isSensitive: Schema.optionalKey(
    Schema.Boolean.annotate({
      description:
        'Whether the policy classifies this email as sensitive (never auto-actioned).'
    })
  )
});

type ClassificationFromModel = Schema.Schema.Type<
  typeof ClassificationFromModel
>;

/** Runs model classification and tool actions for batch triage. */
export class TriageAgent extends Context.Service<
  TriageAgent,
  {
    readonly triageEmail: (
      email: Email,
      options?: TriageEmailOptions
    ) => Effect.Effect<
      {
        readonly classification: Classification;
        readonly actions: ReadonlyArray<TriageActed>;
        readonly approval: ApprovalRequest | null;
      },
      Config.ConfigError | ActionNotFound | ActionNotUndoable | AiError.AiError
    >;
  }
>()('@apps/api/Agent/TriageAgent') {}

/** `TriageAgent` without its dependencies; use {@link TriageAgentLive}. */
export const TriageAgentBody: Layer.Layer<
  TriageAgent,
  never,
  LedgerService | ConversationsRepo | TriageModel | ToolModel
> = Layer.effect(
  TriageAgent,
  Effect.gen(function* () {
    const actions = yield* LedgerService;
    const conversations = yield* ConversationsRepo;
    const triageModel = yield* TriageModel;
    const toolModel = yield* ToolModel;

    /** Generates and normalizes the classification for one email. */
    const generateClassification = Effect.fn(
      'TriageAgent.generateClassification'
    )(function* (email: Email) {
      const response = yield* LanguageModel.generateObject({
        objectName: 'AgenticInboxClassification',
        schema: ClassificationFromModel,
        prompt: [
          {
            role: 'system',
            content:
              'You classify shared-inbox emails. Return only the requested structured object. Do not include emailId; the system already knows which email this is.'
          },
          { role: 'user', content: triageDecisionPrompt(email) }
        ]
      }).pipe(
        Effect.retry({ schedule: retrySchedule }),
        Effect.provideService(LanguageModel.LanguageModel, triageModel)
      );

      return normalizeClassification(email, response.value);
    });

    /** Persists a loop result as complete or awaiting_approval. */
    const saveLoopResult = Effect.fn('TriageAgent.saveLoopResult')(function* (
      result: LoopResult,
      options: {
        readonly id?: string | undefined;
        readonly emailId?: EmailIdType | null | undefined;
      } = {}
    ) {
      return yield* conversations.save({
        id: options.id,
        status: result.pending === null ? 'complete' : 'awaiting_approval',
        prompt: encodePrompt(result.prompt),
        pending: result.pending,
        emailId: options.emailId
      });
    });

    const triageEmail = Effect.fn('TriageAgent.triageEmail')(function* (
      email: Email,
      options: TriageEmailOptions = {}
    ) {
      const before = yield* actions.listLedger(email.id);
      const classification = yield* generateClassification(email);

      const prompt = Prompt.make([
        { role: 'system', content: TRIAGE_SYSTEM_PROMPT },
        { role: 'user', content: triageActionPrompt(email, classification) }
      ]);
      const result = yield* runLoop(
        toolModel,
        actions,
        prompt,
        'triage',
        makeTriageToolkit(classification.isSensitive),
        options.runId
      );
      const approval =
        result.pending === null
          ? null
          : approvalRequestFromPrompt(email.id, result.prompt, result.pending);

      yield* saveLoopResult(result, { emailId: email.id });

      const newEntries = yield* actedSince(actions, email.id, before);
      const newActions = newEntries.map((entry) => new TriageActed({ entry }));
      return { classification, actions: newActions, approval };
    });

    return { triageEmail } as const;
  })
);

/** Production `TriageAgent` with ledger, conversations, and model layers. */
export const TriageAgentLive = Layer.provide(TriageAgentBody, [
  LedgerServiceLive,
  ConversationsRepoLive,
  TriageModelLive,
  ToolModelLive
]);

/** Clamps model-only constraints and applies deterministic sensitivity policy. */
const normalizeClassification = (
  email: Email,
  classification: ClassificationFromModel
): Classification => {
  const category = classification.category ?? 'other';
  const severity = classification.severity ?? 'medium';
  const confidence = Math.max(0, Math.min(1, classification.confidence ?? 0.5));
  const rawWhy =
    classification.whyPreview?.trim() ||
    'Incomplete model output; needs a quick human look.';
  const whyPreview = rawWhy.length > 65 ? rawWhy.slice(0, 65) : rawWhy;
  const rationale =
    classification.rationale?.trim() ||
    'The model returned incomplete structured output; defaults were applied so triage can continue.';
  const keyFacts = classification.keyFacts ?? [];
  return new Classification({
    emailId: email.id,
    category,
    severity,
    confidence,
    whyPreview,
    rationale,
    keyFacts,
    isSensitive: isSensitive({
      category,
      confidence,
      emailBody: `${email.subject}\n${email.body}`
    }),
    policyReasons: []
  });
};
