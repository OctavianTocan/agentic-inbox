import { Effect, Schema } from 'effect';
import { LanguageModel } from 'effect/unstable/ai';
import { type Email, emailById, MODEL, ModelLive } from './shared.ts';

const Category = Schema.Literals([
  'rfi',
  'daily_report',
  'submittal',
  'vendor_quote',
  'schedule',
  'status_update',
  'change_order',
  'claim_dispute',
  'safety',
  'owner_escalation'
]);

const Severity = Schema.Literals(['routine', 'elevated', 'sensitive']);

const Decision = Schema.Struct({
  category: Category,
  severity: Severity,
  confidence: Schema.Number,
  whyPreview: Schema.String,
  rationale: Schema.String,
  keyFacts: Schema.Array(Schema.String)
});
type Decision = typeof Decision.Type;

const SYSTEM = `You triage an AEC (architecture/engineering/construction) project manager's inbox.
For each email classify it into one category and one severity.
Sensitive severity is mandatory for change_order, claim_dispute, safety, and owner_escalation,
or when a wrong auto-reply could cost real money or create legal exposure.
Routine categories (rfi, daily_report, submittal, vendor_quote, schedule, status_update) are
usually "routine" unless dollar amounts, legal language, or ambiguity raise the stakes to "elevated".
whyPreview must be <= 65 characters, plain language, no trailing punctuation.`;

const triageEmail = (email: Email) =>
  Effect.gen(function* () {
    const startedAt = performance.now();
    const response = yield* LanguageModel.generateObject({
      schema: Decision,
      objectName: 'triage_decision',
      prompt: `${SYSTEM}\n\nEmail ${email.id}\nFrom: ${email.from}\nSubject: ${email.subject}\n\n${email.body}`
    });
    const latencyMs = Math.round(performance.now() - startedAt);
    return {
      email,
      decision: response.value,
      latencyMs,
      usage: response.usage
    };
  });

const CASES: ReadonlyArray<{ readonly id: string; readonly label: string }> = [
  { id: 'e-001', label: 'routine RFI' },
  { id: 'e-016', label: 'safety incident' },
  { id: 'e-012', label: 'ambiguous pricing quote' }
];

const program = Effect.gen(function* () {
  yield* Effect.log(`model=${MODEL} reasoning.effort=low`);
  const latencies: Array<number> = [];
  for (const testCase of CASES) {
    const email = emailById(testCase.id);
    const result = yield* triageEmail(email);
    latencies.push(result.latencyMs);
    const decision: Decision = result.decision;
    yield* Effect.log(
      [
        `\n=== ${testCase.id} (${testCase.label}) — ${result.latencyMs}ms ===`,
        `subject : ${email.subject}`,
        `category: ${decision.category}`,
        `severity: ${decision.severity}`,
        `confid. : ${decision.confidence}`,
        `why     : ${decision.whyPreview} (${decision.whyPreview.length} chars)`,
        `facts   : ${decision.keyFacts.join(' | ')}`,
        `rationale: ${decision.rationale}`,
        `tokens  : in=${result.usage.inputTokens.total} out=${result.usage.outputTokens.total}`
      ].join('\n')
    );
  }
  const avg = Math.round(
    latencies.reduce((sum, n) => sum + n, 0) / latencies.length
  );
  yield* Effect.log(`\nlatency ms: ${latencies.join(', ')}  avg=${avg}`);
});

Effect.runPromise(program.pipe(Effect.provide(ModelLive))).catch((error) => {
  console.error('SCRIPT A FAILED:', error);
  process.exit(1);
});
