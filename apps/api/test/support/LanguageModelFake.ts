import { Effect, Layer, Stream } from 'effect';
import {
  IdGenerator,
  LanguageModel,
  type Prompt,
  type Response
} from 'effect/unstable/ai';

/** The encoded response parts the provider hook returns for one model turn. */
export type ScriptedTurn = ReadonlyArray<Response.PartEncoded>;

/**
 * Produces the model's next response parts from the live conversation.
 *
 * `LanguageModel.make` invokes the provider hook once per agent turn, passing
 * the full prompt so far. The script inspects that prompt (whether an approval
 * response is present, whether a tool already ran) and returns the parts the
 * model should "emit" next; the surrounding machinery still runs the real
 * approval gate and tool handlers.
 */
export type GenerateTextScript = (prompt: Prompt.Prompt) => ScriptedTurn;

/** Builds a `text` response part carrying plain assistant text. */
export const textPart = (text: string): Response.PartEncoded => ({
  type: 'text',
  text
});

/** Builds a `tool-call` response part the framework routes to the toolkit handler. */
export const toolCallPart = (input: {
  readonly id: string;
  readonly name: string;
  readonly params: Record<string, unknown>;
}): Response.PartEncoded => ({
  type: 'tool-call',
  id: input.id,
  name: input.name,
  params: input.params
});

/** True once the prompt carries a `tool-approval-response` (i.e. after resolveApproval resumes). */
export const hasApprovalResponse = (prompt: Prompt.Prompt): boolean =>
  prompt.content.some(
    (message) =>
      message.role === 'tool' &&
      message.content.some((part) => part.type === 'tool-approval-response')
  );

/** True once the prompt carries a `tool-result` (i.e. a tool has already executed). */
export const hasToolResult = (prompt: Prompt.Prompt): boolean =>
  prompt.content.some(
    (message) =>
      message.role === 'tool' &&
      message.content.some((part) => part.type === 'tool-result')
  );

/**
 * Builds a fake `LanguageModel` layer whose single provider hook replays a
 * script instead of calling a real provider, so the triage decision call, the
 * tool loop, and the approval-resume path all run deterministically with no
 * network and no API key.
 *
 * `LanguageModel.make` has one `generateText` hook that serves both
 * `generateText` and `generateObject`; the two are told apart by
 * `responseFormat.type` (`'json'` for structured output). For a `json` request
 * the fake returns a single `text` part carrying `decisionJson`, which the
 * framework decodes against the caller's schema. For a `text` request it returns
 * the script's parts, letting the real gate emit `tool-approval-request` for
 * sensitive tools or execute the handler and append `tool-result` otherwise.
 *
 * @param options.generateText - Maps the live prompt to the model's next parts on text requests.
 * @param options.classificationJson - JSON string a structured-output (`generateObject`) request resolves to.
 * @returns A layer providing `LanguageModel.LanguageModel`; it never fails.
 */
export const makeLanguageModelFake = (options: {
  readonly generateText: GenerateTextScript;
  readonly decisionJson?: string;
}): Layer.Layer<LanguageModel.LanguageModel> =>
  Layer.effect(
    LanguageModel.LanguageModel,
    LanguageModel.make({
      generateText: (providerOptions) =>
        providerOptions.responseFormat.type === 'json'
          ? Effect.succeed([
              textPart(
                options.decisionJson ??
                  '{"error":"decisionJson not provided to fake"}'
              )
            ])
          : Effect.succeed([...options.generateText(providerOptions.prompt)]),
      streamText: () => Stream.empty
    })
  ).pipe(
    Layer.provide(
      Layer.succeed(IdGenerator.IdGenerator, IdGenerator.defaultIdGenerator)
    )
  );
