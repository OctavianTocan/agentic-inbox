import { ChatFailed } from '@app/api-core/Modules/Chat/Errors';
import { type Cause, Effect, Exit, Logger, Stream } from 'effect';
import { describe, expect, it } from 'vitest';
import { streamChatTurn } from '@/Modules/Chat/Http';

type Captured = {
  readonly level: string;
  readonly message: unknown;
  readonly cause: string;
};

/** Runs an effect under a logger that records every log event for assertions. */
const runCapturingLogs = <A, E>(
  effect: Effect.Effect<A, E>
): Promise<{ readonly exit: Exit.Exit<A, E>; readonly logs: Captured[] }> => {
  const logs: Captured[] = [];
  const capture = Logger.make<unknown, void>((options) => {
    logs.push({
      level: options.logLevel,
      message: options.message,
      cause: String(options.cause)
    });
  });
  return Effect.exit(effect)
    .pipe(Effect.provide(Logger.layer([capture])), Effect.runPromise)
    .then((exit) => ({ exit, logs }));
};

describe('streamChatTurn', () => {
  it('streams the turn events unchanged on success', async () => {
    const events = [{ type: 'text_delta', delta: 'hi' }] as const;
    const { exit, logs } = await runCapturingLogs(
      streamChatTurn(Effect.succeed(events)).pipe(
        Effect.flatMap((stream) => {
          const collected: unknown[] = [];
          return Stream.runForEach(stream, (event) =>
            Effect.sync(() => {
              collected.push(event);
            })
          ).pipe(Effect.as(collected));
        })
      )
    );

    expect(Exit.isSuccess(exit)).toBe(true);
    if (Exit.isSuccess(exit)) {
      expect(exit.value).toEqual(events);
    }
    expect(logs.some((entry) => entry.level === 'Error')).toBe(false);
  });

  it('logs the full cause and maps a typed failure to ChatFailed', async () => {
    const { exit, logs } = await runCapturingLogs(
      streamChatTurn(Effect.fail(new Error('openrouter timed out')))
    );

    expect(Exit.isFailure(exit)).toBe(true);
    if (Exit.isFailure(exit)) {
      const failure = exit.cause.reasons.find(
        (reason): reason is Cause.Fail<ChatFailed> =>
          reason._tag === 'Fail' && reason.error instanceof ChatFailed
      );
      expect(failure?.error.detail).toBe('openrouter timed out');
    }

    const errorLog = logs.find((entry) => entry.level === 'Error');
    expect(errorLog).toBeDefined();
    expect(errorLog?.cause).toContain('openrouter timed out');
  });

  it('logs defects instead of swallowing them', async () => {
    const { exit, logs } = await runCapturingLogs(
      streamChatTurn(Effect.die(new Error('prompt failed to encode')))
    );

    expect(Exit.isFailure(exit)).toBe(true);
    const errorLog = logs.find((entry) => entry.level === 'Error');
    expect(errorLog).toBeDefined();
    expect(errorLog?.cause).toContain('prompt failed to encode');
  });
});
