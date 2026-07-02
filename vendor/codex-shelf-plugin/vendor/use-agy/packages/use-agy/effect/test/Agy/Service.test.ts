import { it } from '@effect/vitest';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import { describe, expect } from 'vitest';
import { AgyJsonError } from '@/Modules/Agy/Errors';
import { AgyProcess } from '@/Modules/Agy/Process';
import { Agy, fakeLayer, testLayer } from '@/Modules/Agy/Service';

describe('Agy Service', () => {
  it.effect('reports available when agy status exits zero', () => {
    const processLayer = Layer.succeed(
      AgyProcess,
      AgyProcess.of({
        run: () =>
          Effect.succeed({
            stdout: 'Usage of agy',
            stderr: '',
            exitCode: 0,
          }),
      })
    );

    return Effect.gen(function* () {
      const agy = yield* Agy;
      const status = yield* agy.status();

      expect(status).toBe('available');
    }).pipe(Effect.provide(testLayer), Effect.provide(processLayer));
  });

  it.effect('maps non-zero run exits to AgyExitError', () => {
    const processLayer = Layer.succeed(
      AgyProcess,
      AgyProcess.of({
        run: () =>
          Effect.succeed({ stdout: '', stderr: 'bad flag', exitCode: 2 }),
      })
    );

    return Effect.gen(function* () {
      const agy = yield* Agy;
      const result = yield* Effect.flip(agy.runText({ prompt: 'hello' }));

      expect(result._tag).toBe('AgyExitError');
    }).pipe(Effect.provide(testLayer), Effect.provide(processLayer));
  });

  it.effect('parses strict JSON stdout', () => {
    const processLayer = Layer.succeed(
      AgyProcess,
      AgyProcess.of({
        run: () =>
          Effect.succeed({
            stdout: '{"ok":true}',
            stderr: '',
            exitCode: 0,
          }),
      })
    );

    return Effect.gen(function* () {
      const agy = yield* Agy;
      const result = yield* agy.runJson({ prompt: 'json' });

      expect(result.value).toEqual({ ok: true });
    }).pipe(Effect.provide(testLayer), Effect.provide(processLayer));
  });

  it.effect('rejects fenced JSON stdout', () => {
    const processLayer = Layer.succeed(
      AgyProcess,
      AgyProcess.of({
        run: () =>
          Effect.succeed({
            stdout: '```json\n{"ok":true}\n```',
            stderr: '',
            exitCode: 0,
          }),
      })
    );

    return Effect.gen(function* () {
      const agy = yield* Agy;
      const result = yield* Effect.flip(agy.runJson({ prompt: 'json' }));

      expect(result).toBeInstanceOf(AgyJsonError);
    }).pipe(Effect.provide(testLayer), Effect.provide(processLayer));
  });

  it.effect('supports fake service layers', () =>
    Effect.gen(function* () {
      const agy = yield* Agy;
      const text = yield* agy.runText({ prompt: 'ignored' });

      expect(text.stdout).toBe('fake');
    }).pipe(
      Effect.provide(
        fakeLayer({
          text: {
            stdout: 'fake',
            stderr: '',
            exitCode: 0,
          },
        })
      )
    )
  );
});
