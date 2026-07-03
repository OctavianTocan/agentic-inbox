import {
  OpenRouterClient,
  OpenRouterLanguageModel
} from '@effect/ai-openrouter';
import { Config, Layer, Redacted } from 'effect';
import { IdGenerator, type LanguageModel } from 'effect/unstable/ai';
import { FetchHttpClient } from 'effect/unstable/http';

/** Model id, overridable via `OPENROUTER_MODEL`; defaults to the spike-proven `openai/gpt-5.5`. */
export const MODEL = process.env.OPENROUTER_MODEL ?? 'openai/gpt-5.5';

const ClientLive = OpenRouterClient.layerConfig({
  apiKey: Config.map(Config.string('OPENROUTER_API_KEY'), Redacted.make)
}).pipe(Layer.provide(FetchHttpClient.layer));

const IdGeneratorLive = Layer.succeed(
  IdGenerator.IdGenerator,
  IdGenerator.defaultIdGenerator
);

/**
 * Structured-output model for `generateObject` triage. `strictJsonSchema` is on
 * because gpt-5.5 drops required fields without it (SPIKE-NOTES finding 1); this
 * config must NOT drive the tool path (SPIKE-NOTES finding 3).
 */
export const TriageModelLive: Layer.Layer<
  LanguageModel.LanguageModel,
  Config.ConfigError
> = OpenRouterLanguageModel.layer({
  model: MODEL,
  config: { reasoning: { effort: 'low' }, strictJsonSchema: true }
}).pipe(Layer.provide(IdGeneratorLive), Layer.provide(ClientLive));

/**
 * Tool-calling model for `generateText`. `strictJsonSchema` is off; tool
 * strictness is carried per-tool via `Tool.Strict` instead (SPIKE-NOTES
 * finding 3), because gpt-5.5 rejects strict-mode tool schemas.
 */
export const ToolModelLive: Layer.Layer<
  LanguageModel.LanguageModel,
  Config.ConfigError
> = OpenRouterLanguageModel.layer({
  model: MODEL,
  config: { reasoning: { effort: 'low' } }
}).pipe(Layer.provide(IdGeneratorLive), Layer.provide(ClientLive));
