import { Console, Effect, type Layer, Schema } from 'effect';
import { Tool, Toolkit } from 'effect/unstable/ai';

// gpt-5.5 via OpenRouter rejects tool defs sent with `strict: null` ("Tool type
// is explicitly modeled and must match its strict schema"). `Tool.Strict, true`
// makes the provider emit `strict: true`, which the model requires.
const RecordTriage = Tool.make('record_triage', {
  description:
    'Record the triage decision for the email. Always call this first.',
  parameters: Schema.Struct({
    emailId: Schema.String,
    category: Schema.String,
    severity: Schema.Literals(['routine', 'elevated', 'sensitive']),
    whyPreview: Schema.String
  }),
  success: Schema.Struct({ recorded: Schema.Boolean })
}).annotate(Tool.Strict, true);

const SendReply = Tool.make('send_reply', {
  description:
    'Send a reply to the sender of the email. Requires human approval before it executes.',
  parameters: Schema.Struct({
    emailId: Schema.String,
    body: Schema.String
  }),
  success: Schema.Struct({ sent: Schema.Boolean, messageId: Schema.String }),
  needsApproval: true
}).annotate(Tool.Strict, true);

export const InboxToolkit = Toolkit.make(RecordTriage, SendReply);

/**
 * Handler layer for {@link InboxToolkit}. Both tools simulate their effect and
 * log a side-effect line so a successful resume is observable in process output.
 */
export const InboxToolkitLayer: Layer.Layer<
  Tool.HandlersFor<Toolkit.Tools<typeof InboxToolkit>>
> = InboxToolkit.toLayer({
  record_triage: (params) =>
    Effect.gen(function* () {
      yield* Console.log(
        `  [tool] record_triage ${params.emailId} -> ${params.severity}`
      );
      return { recorded: true };
    }),
  send_reply: (params) =>
    Effect.gen(function* () {
      yield* Console.log(`  [tool] send_reply EXECUTED for ${params.emailId}`);
      return { sent: true, messageId: `sim-${params.emailId}-${Date.now()}` };
    })
});
