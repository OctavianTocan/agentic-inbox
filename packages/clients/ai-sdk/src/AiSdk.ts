import {
  generateText as sdkGenerateText,
  streamText as sdkStreamText
} from 'ai';
import { Context, Effect, Layer } from 'effect';
import { AiSdkError } from './Errors';

export type GenerateTextParams = Parameters<typeof sdkGenerateText>[0];
export type GenerateTextSuccess = Awaited<ReturnType<typeof sdkGenerateText>>;
export type StreamTextParams = Parameters<typeof sdkStreamText>[0];
export type StreamTextSuccess = ReturnType<typeof sdkStreamText>;

const toAiSdkError = (operation: string, cause: unknown) =>
  new AiSdkError({
    operation,
    message: cause instanceof Error ? cause.message : String(cause),
    cause
  });

export class AiSdk extends Context.Service<
  AiSdk,
  {
    readonly generateText: (
      params: GenerateTextParams
    ) => Effect.Effect<GenerateTextSuccess, AiSdkError>;
    readonly streamText: (
      params: StreamTextParams
    ) => Effect.Effect<StreamTextSuccess, AiSdkError>;
  }
>()('@clients/ai-sdk/AiSdk') {
  static readonly layer = Layer.succeed(AiSdk, {
    generateText: (params) =>
      Effect.tryPromise({
        try: () => sdkGenerateText(params),
        catch: (cause) => toAiSdkError('generateText', cause)
      }),
    streamText: (params) =>
      Effect.try({
        try: () => sdkStreamText(params),
        catch: (cause) => toAiSdkError('streamText', cause)
      })
  });
}
