import { readFileSync } from 'node:fs';
import {
  OpenRouterClient,
  OpenRouterLanguageModel
} from '@effect/ai-openrouter';
import { Config, Layer, Redacted, Schema } from 'effect';
import { IdGenerator } from 'effect/unstable/ai';
import { FetchHttpClient } from 'effect/unstable/http';

const MODEL = process.env.OPENROUTER_MODEL ?? 'openai/gpt-5.5';

export const Email = Schema.Struct({
  id: Schema.String,
  from: Schema.String,
  to: Schema.String,
  subject: Schema.String,
  body: Schema.String,
  timestamp: Schema.String
});
export type Email = typeof Email.Type;

/** Loads the sanitized email dataset from the repo `data/emails.json` fixture. */
export const loadEmails = (): ReadonlyArray<Email> => {
  const raw = readFileSync(
    new URL('../../data/emails.json', import.meta.url),
    'utf8'
  );
  return JSON.parse(raw) as ReadonlyArray<Email>;
};

/** Finds a single email by id, throwing if the fixture does not contain it. */
export const emailById = (id: string): Email => {
  const email = loadEmails().find((candidate) => candidate.id === id);
  if (!email) throw new Error(`email ${id} not found in fixture`);
  return email;
};

const OpenRouterClientLive = OpenRouterClient.layerConfig({
  apiKey: Config.map(Config.string('OPENROUTER_API_KEY'), Redacted.make)
}).pipe(Layer.provide(FetchHttpClient.layer));

/**
 * The OpenRouter `gpt-5.5` language model wired with reasoning effort `low`,
 * a default id generator, and a fetch-backed client.
 */
const IdGeneratorLive = Layer.succeed(
  IdGenerator.IdGenerator,
  IdGenerator.defaultIdGenerator
);

/**
 * Structured-output model (Script A). Strict JSON schema is required so the
 * model returns every field; without it gpt-5.5 drops keys.
 */
export const ModelLive = OpenRouterLanguageModel.layer({
  model: MODEL,
  config: { reasoning: { effort: 'low' }, strictJsonSchema: true }
}).pipe(
  Layer.provideMerge(IdGeneratorLive),
  Layer.provide(OpenRouterClientLive)
);

/**
 * Tool-loop model (Script B). Strict JSON schema is OFF: gpt-5.5 rejects tool
 * definitions rendered under OpenAI strict mode ("Tool type is explicitly
 * modeled and must match its strict schema").
 */
export const ToolModelLive = OpenRouterLanguageModel.layer({
  model: MODEL,
  config: { reasoning: { effort: 'low' } }
}).pipe(
  Layer.provideMerge(IdGeneratorLive),
  Layer.provide(OpenRouterClientLive)
);

export { MODEL };
