import { writeFileSync } from 'node:fs';
import { Console, Effect, Layer } from 'effect';
import { Prompt } from 'effect/unstable/ai';
import { encodePrompt, runLoop } from './loop.ts';
import { emailById, ToolModelLive } from './shared.ts';
import { InboxToolkitLayer } from './toolkit.ts';

const STATE_PATH = new URL('../state/paused.json', import.meta.url);

const SYSTEM =
  `You are an inbox agent. For the given email: (1) call record_triage with your decision, ` +
  `then (2) if a reply is warranted, call send_reply with a short professional draft. ` +
  `send_reply requires human approval, so just request it — do not expect it to run immediately.`;

const program = Effect.gen(function* () {
  const email = emailById('e-012');
  const initial = Prompt.make([
    { role: 'system', content: SYSTEM },
    {
      role: 'user',
      content: `Email ${email.id}\nFrom: ${email.from}\nSubject: ${email.subject}\n\n${email.body}`
    }
  ]);

  const result = yield* runLoop(initial);

  if (result._tag !== 'awaiting-approval') {
    yield* Console.log(
      `UNEXPECTED: loop finished as '${result._tag}' without an approval pause`
    );
    return;
  }

  const encoded = encodePrompt(result.prompt);
  writeFileSync(
    STATE_PATH,
    JSON.stringify(
      { approvals: result.approvals, turns: result.turns, prompt: encoded },
      null,
      2
    )
  );
  yield* Console.log(
    `PAUSED after ${result.turns} turn(s). Pending approvals:`
  );
  for (const approval of result.approvals) {
    yield* Console.log(
      `  approvalId=${approval.approvalId} toolCallId=${approval.toolCallId}`
    );
  }
  yield* Console.log(`State serialized to ${STATE_PATH.pathname}. Exit clean.`);
});

Effect.runPromise(
  program.pipe(Effect.provide(Layer.mergeAll(ToolModelLive, InboxToolkitLayer)))
).catch((error) => {
  console.error('PAUSE SCRIPT FAILED:', error);
  process.exit(1);
});
