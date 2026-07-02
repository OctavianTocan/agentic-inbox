import type {
  DraftRequest,
  DraftResponse
} from '@app/api-core/Modules/Ai/Domain';
import { DraftResponse as DraftResponseClass } from '@app/api-core/Modules/Ai/Domain';
import { AiDraftError } from '@app/api-core/Modules/Ai/Errors';
import { AiSdk } from '@clients/ai-sdk';
import type { LanguageModel } from 'ai';
import { Context, Effect, Layer } from 'effect';

/** AI draft service used by HTTP handlers. */
export class AiDraftService extends Context.Service<
  AiDraftService,
  {
    readonly draft: (
      request: DraftRequest
    ) => Effect.Effect<DraftResponse, AiDraftError>;
  }
>()('@apps/api/AiDraftService') {}

/** Vercel AI SDK model provider for the live backend path. */
export class AiLanguageModel extends Context.Service<
  AiLanguageModel,
  {
    readonly model: LanguageModel;
  }
>()('@apps/api/AiLanguageModel') {}

/** Mock-safe starter service that keeps the backend runnable without secrets. */
export const AiDraftServiceMock = Layer.succeed(AiDraftService, {
  draft: (request) =>
    Effect.succeed(
      new DraftResponseClass({
        text: `Backend is wired. Replace AiDraftServiceMock with AiDraftServiceLive to send this prompt through the Vercel AI SDK: ${request.prompt}`
      })
    )
});

/**
 * Live AI SDK backed service shape. Add a provider package such as
 * `@ai-sdk/openai`, construct the model here, and use this layer instead of
 * `AiDraftServiceMock`.
 */
export const AiDraftServiceLive = Layer.effect(
  AiDraftService,
  Effect.gen(function* () {
    const ai = yield* AiSdk;
    const languageModel = yield* AiLanguageModel;

    return {
      draft: (request) =>
        ai
          .generateText({
            model: languageModel.model,
            prompt: request.prompt
          })
          .pipe(
            Effect.map(
              (response) =>
                new DraftResponseClass({
                  text: response.text
                })
            ),
            Effect.mapError(
              (error) =>
                new AiDraftError({
                  detail: error.message
                })
            )
          )
    };
  })
).pipe(Layer.provide(AiSdk.layer));
