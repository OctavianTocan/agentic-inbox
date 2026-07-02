import { readFileSync } from 'node:fs';
import { Console, Effect, Layer } from 'effect';
import { Prompt } from 'effect/unstable/ai';
import { decodePrompt, runLoop } from './loop.ts';
import { ToolModelLive } from './shared.ts';
import { InboxToolkitLayer } from './toolkit.ts';

const STATE_PATH = new URL('../state/paused.json', import.meta.url);

type PausedState = {
  readonly approvals: ReadonlyArray<{
    readonly approvalId: string;
    readonly toolCallId: string;
  }>;
  readonly turns: number;
  readonly prompt: Prompt.PromptEncoded;
};

const program = Effect.gen(function* () {
  const state = JSON.parse(readFileSync(STATE_PATH, 'utf8')) as PausedState;
  yield* Console.log(
    `Loaded paused state (${state.approvals.length} pending approval(s)) in FRESH process.`
  );

  const history = decodePrompt(state.prompt);

  const approved = process.env.DENY !== '1';
  const approvalMessages = Prompt.make([
    {
      role: 'tool',
      content: state.approvals.map((approval) => ({
        type: 'tool-approval-response' as const,
        approvalId: approval.approvalId,
        approved,
        ...(approved
          ? {}
          : { reason: 'PM declined the auto-reply; will handle manually.' })
      }))
    }
  ]);

  const resumed = Prompt.concat(history, approvalMessages);
  yield* Console.log(
    `Appended tool-approval-response (approved=${approved}). Resuming loop...`
  );

  const result = yield* runLoop(resumed, state.turns);

  if (result._tag === 'awaiting-approval') {
    yield* Console.log('STILL awaiting approval after resume — unexpected.');
    return;
  }
  yield* Console.log(`RESUME COMPLETE after total ${result.turns} turn(s).`);
  yield* Console.log(`Final assistant text: ${result.text || '(none)'}`);
});

Effect.runPromise(
  program.pipe(Effect.provide(Layer.mergeAll(ToolModelLive, InboxToolkitLayer)))
).catch((error) => {
  console.error('RESUME SCRIPT FAILED:', error);
  process.exit(1);
});
