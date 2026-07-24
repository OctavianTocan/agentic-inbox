import {
  OpenRouterClient,
  OpenRouterLanguageModel
} from '@effect/ai-openrouter';
import { Config, Context, Effect, Layer } from 'effect';
import { IdGenerator, LanguageModel } from 'effect/unstable/ai';
import { FetchHttpClient } from 'effect/unstable/http';
import { AppConfig } from '@/Infrastructure/AppConfig';

/**
 * The structured-output model role used by the triage decision call. A distinct
 * tag from {@link ToolModel} keeps the two model configs injectable and
 * separately overridable (tests supply a fake for both).
 */
export class TriageModel extends Context.Service<
  TriageModel,
  LanguageModel.Service
>()('@apps/api/Agent/TriageModel') {}

/**
 * The tool-calling model role used by the agent tool loop. A distinct tag from
 * {@link TriageModel} keeps the two model configs injectable and
 * separately overridable (tests supply a fake for both).
 */
export class ToolModel extends Context.Service<
  ToolModel,
  LanguageModel.Service
>()('@apps/api/Agent/ToolModel') {}

const ClientLive = OpenRouterClient.layerConfig({
  apiKey: Config.redacted('OPENROUTER_API_KEY')
}).pipe(Layer.provide(FetchHttpClient.layer));

const IdGeneratorLive = Layer.succeed(
  IdGenerator.IdGenerator,
  IdGenerator.defaultIdGenerator
);

/** Rebinds a built `LanguageModel` layer under the given model-role tag. */
const modelRoleLayer = <Self, Id extends string>(
  tag: Context.ServiceClass<Self, Id, LanguageModel.Service>,
  source: Layer.Layer<LanguageModel.LanguageModel, Config.ConfigError>
): Layer.Layer<Self, Config.ConfigError> =>
  Layer.effect(tag, LanguageModel.LanguageModel).pipe(Layer.provide(source));

/** OpenRouter LanguageModel under a role tag, reading `OPENROUTER_MODEL`. */
const openRouterModelRole = <Self, Id extends string>(
  tag: Context.ServiceClass<Self, Id, LanguageModel.Service>,
  build: (
    model: string
  ) => Layer.Layer<LanguageModel.LanguageModel, Config.ConfigError>
): Layer.Layer<Self, Config.ConfigError> =>
  Layer.unwrap(
    Effect.gen(function* () {
      const { openRouterModel } = yield* AppConfig;
      return modelRoleLayer(tag, build(openRouterModel));
    })
  );

/**
 * Structured-output model for `generateObject` triage.
 *
 * OpenRouter structured outputs use `response_format.type = json_schema` with
 * `strict: true` (https://openrouter.ai/docs/guides/features/structured-outputs).
 * `@effect/ai-openrouter` emits that when `strictJsonSchema` is true.
 *
 * Do **not** set `provider.require_parameters` here: many free models advertise
 * `structured_outputs` but not `response_format`, and requiring the latter
 * returns 404 "No endpoints found that can handle the requested parameters".
 *
 * `response-healing` repairs truncated / markdown-wrapped JSON before decode.
 * This config must NOT drive the tool path (SPIKE-NOTES finding 3).
 */
export const TriageModelLive: Layer.Layer<TriageModel, Config.ConfigError> =
  openRouterModelRole(TriageModel, (model) =>
    OpenRouterLanguageModel.layer({
      model,
      config: {
        reasoning: { effort: 'low' },
        strictJsonSchema: true,
        plugins: [{ id: 'response-healing' }]
      }
    }).pipe(Layer.provide(IdGeneratorLive), Layer.provide(ClientLive))
  );

/**
 * Tool-calling model for `generateText`. `strictJsonSchema` is off; tool
 * strictness is carried per-tool via `Tool.Strict` instead (SPIKE-NOTES
 * finding 3), because gpt-5.5 rejects strict-mode tool schemas.
 */
export const ToolModelLive: Layer.Layer<ToolModel, Config.ConfigError> =
  openRouterModelRole(ToolModel, (model) =>
    OpenRouterLanguageModel.layer({
      model,
      config: { reasoning: { effort: 'low' } }
    }).pipe(Layer.provide(IdGeneratorLive), Layer.provide(ClientLive))
  );
