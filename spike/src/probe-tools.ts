import {
  OpenRouterClient,
  OpenRouterLanguageModel
} from '@effect/ai-openrouter';
import { Config, Effect, Layer, Redacted } from 'effect';
import { IdGenerator, LanguageModel, Prompt } from 'effect/unstable/ai';
import {
  FetchHttpClient,
  HttpClient,
  HttpClientRequest
} from 'effect/unstable/http';
import { InboxToolkit, InboxToolkitLayer } from './toolkit.ts';

const FIX_STRICT = process.env.FIX_STRICT === '1';

const logBody = (client: HttpClient.HttpClient): HttpClient.HttpClient =>
  HttpClient.mapRequest(client, (request) => {
    const bytes = (request.body as { body?: Uint8Array }).body;
    if (!(bytes instanceof Uint8Array)) return request;
    const text = new TextDecoder().decode(bytes);
    if (!text.includes('record_triage')) return request;
    const parsed = JSON.parse(text);
    console.log(
      '=== strict values ===',
      parsed.tools.map(
        (t: { function: { strict: unknown } }) => t.function.strict
      )
    );
    if (!FIX_STRICT) return request;
    for (const tool of parsed.tools) tool.function.strict = true;
    return HttpClientRequest.bodyText(
      request,
      JSON.stringify(parsed),
      'application/json'
    );
  });

const LoggingHttpClient = Layer.effect(
  HttpClient.HttpClient,
  Effect.map(HttpClient.HttpClient, logBody)
).pipe(Layer.provide(FetchHttpClient.layer));

const ClientLive = OpenRouterClient.layerConfig({
  apiKey: Config.map(Config.string('OPENROUTER_API_KEY'), Redacted.make)
}).pipe(Layer.provide(LoggingHttpClient));

const ModelLive = OpenRouterLanguageModel.layer({
  model: 'openai/gpt-5.5',
  config: { reasoning: { effort: 'low' } }
}).pipe(
  Layer.provideMerge(
    Layer.succeed(IdGenerator.IdGenerator, IdGenerator.defaultIdGenerator)
  ),
  Layer.provide(ClientLive)
);

const program = LanguageModel.generateText({
  toolkit: InboxToolkit,
  prompt: Prompt.make(
    "Call record_triage for email e-999 with category rfi severity routine why 'test'."
  )
}).pipe(
  Effect.tap((r) => Effect.sync(() => console.log('TEXT:', r.text))),
  Effect.catchCause((cause) =>
    Effect.sync(() => console.log('ERR:', JSON.stringify(cause).slice(0, 300)))
  )
);

Effect.runPromise(
  program.pipe(Effect.provide(Layer.mergeAll(ModelLive, InboxToolkitLayer)))
).catch((e) => console.error(e));
