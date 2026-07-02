import { Decision } from '@app/api-core/Modules/Triage/Domain';
import { Effect, Schedule, Schema } from 'effect';
import { SliceModelError } from './errors';

const OpenRouterChoice = Schema.Struct({
  message: Schema.Struct({
    content: Schema.String
  })
});

const OpenRouterResponse = Schema.Struct({
  choices: Schema.Array(OpenRouterChoice)
});

const modelName = Bun.env.OPENROUTER_MODEL ?? 'openai/gpt-5.5';

const decisionJsonSchema = {
  name: 'CogramInboxDecision',
  strict: true,
  schema: {
    type: 'object',
    additionalProperties: false,
    required: [
      'emailId',
      'category',
      'severity',
      'confidence',
      'whyPreview',
      'rationale',
      'keyFacts',
      'isSensitive'
    ],
    properties: {
      emailId: { type: 'string' },
      category: {
        type: 'string',
        enum: [
          'rfi',
          'daily_report',
          'submittal',
          'vendor_quote',
          'schedule',
          'status_update',
          'change_order',
          'claim_dispute',
          'safety',
          'owner_escalation',
          'other'
        ]
      },
      severity: {
        type: 'string',
        enum: ['low', 'medium', 'high', 'critical']
      },
      confidence: { type: 'number' },
      whyPreview: { type: 'string' },
      rationale: { type: 'string' },
      keyFacts: {
        type: 'array',
        items: { type: 'string' }
      },
      isSensitive: { type: 'boolean' }
    }
  }
};

/** Builds the model prompt for one email. */
export function decisionPrompt(input: {
  readonly id: string;
  readonly from: string;
  readonly to: readonly string[];
  readonly cc: readonly string[];
  readonly subject: string;
  readonly body: string;
  readonly timestamp: string;
}): string {
  return `Classify this AEC project email for a PM inbox.

Return only the structured decision. Categories: rfi, daily_report, submittal, vendor_quote, schedule, status_update, change_order, claim_dispute, safety, owner_escalation, other.
Sensitive categories are change_order, claim_dispute, safety, owner_escalation.
Keep whyPreview at 65 characters or less.

Email:
id: ${input.id}
from: ${input.from}
to: ${input.to.join(', ')}
cc: ${input.cc.join(', ')}
timestamp: ${input.timestamp}
subject: ${input.subject}
body:
${input.body}`;
}

/** Requests a structured triage decision from OpenRouter. */
export function generateDecision(
  prompt: string
): Effect.Effect<Decision, SliceModelError> {
  return Effect.tryPromise({
    try: async () => {
      const response = await fetch(
        'https://openrouter.ai/api/v1/chat/completions',
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${Bun.env.OPENROUTER_API_KEY ?? ''}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            model: modelName,
            reasoning: { effort: 'low' },
            messages: [
              {
                role: 'system',
                content:
                  'You are a careful construction project inbox triage agent. Classify only; never promise action.'
              },
              { role: 'user', content: prompt }
            ],
            response_format: {
              type: 'json_schema',
              json_schema: decisionJsonSchema
            }
          })
        }
      );
      const text = await response.text();
      if (!response.ok) {
        throw new SliceModelError({
          detail: text,
          status: response.status
        });
      }
      const decoded = Schema.decodeUnknownSync(OpenRouterResponse)(
        JSON.parse(text)
      );
      const first = decoded.choices[0];
      if (first === undefined) {
        throw new SliceModelError({ detail: 'OpenRouter returned no choices' });
      }
      return Schema.decodeUnknownSync(Decision)(
        JSON.parse(first.message.content)
      );
    },
    catch: (error) => normalizeModelError(error)
  }).pipe(
    Effect.retry({
      schedule: Schedule.exponential('250 millis').pipe(Schedule.take(3)),
      while: (error) => isRetryableStatus(error.status)
    })
  );
}

/** Converts unknown promise failures into the slice model error type. */
function normalizeModelError(error: unknown): SliceModelError {
  if (error instanceof SliceModelError) {
    return error;
  }

  if (error instanceof Error) {
    return new SliceModelError({ detail: error.message });
  }

  return new SliceModelError({ detail: 'Unknown OpenRouter failure' });
}

/** Retries only transient OpenRouter failures. */
/** Returns true for status codes that should be retried by the caller. */
export function isRetryableStatus(status: number | undefined): boolean {
  if (status === undefined) {
    return false;
  }

  return status === 429 || status >= 500;
}
