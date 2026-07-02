import { it } from '@effect/vitest';
import {
  AgyJsonParseError,
  AgyRunError,
  AgyValidationError,
} from '@use-agy/api-core/Modules/Agy/Errors';
import { AgyExitError, AgyJsonError } from '@use-agy/effect/Modules/Agy/Errors';
import { Agy, fakeLayer } from '@use-agy/effect/Modules/Agy/Service';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import { describe, expect } from 'vitest';
import { AgyHttpLive } from '../../src/Modules/Agy/Http';
import {
  LocalAgyApi,
  layer as LocalAgyApiLive,
} from '../../src/Modules/Agy/Service';

describe('AGY API handlers', () => {
  it.effect('maps local AGY text results through the app facade', () =>
    Effect.gen(function* () {
      const agy = yield* LocalAgyApi;
      const result = yield* agy.runText({ prompt: 'hello' });

      expect(result).toEqual({
        stdout: 'done',
        stderr: '',
        exitCode: 0,
      });
    }).pipe(
      Effect.provide(LocalAgyApiLive),
      Effect.provide(
        fakeLayer({
          text: {
            stdout: 'done',
            stderr: '',
            exitCode: 0,
          },
        })
      )
    )
  );

  it.effect('classifies empty prompts as validation errors', () =>
    Effect.gen(function* () {
      const agy = yield* LocalAgyApi;
      const error = yield* Effect.flip(agy.runText({ prompt: '   ' }));

      if (!(error instanceof AgyValidationError)) {
        throw new Error(`Expected AgyValidationError, got ${error._tag}`);
      }
      expect(error.field).toBe('prompt');
    }).pipe(Effect.provide(LocalAgyApiLive), Effect.provide(fakeLayer()))
  );

  it.effect('classifies invalid JSON output separately', () =>
    Effect.gen(function* () {
      const agy = yield* LocalAgyApi;
      const error = yield* Effect.flip(agy.runJson({ prompt: 'json' }));

      if (!(error instanceof AgyJsonParseError)) {
        throw new Error(`Expected AgyJsonParseError, got ${error._tag}`);
      }
      expect(error.raw).toBe('not json');
    }).pipe(
      Effect.provide(LocalAgyApiLive),
      Effect.provide(
        Layer.succeed(
          Agy,
          Agy.of({
            status: () => Effect.succeed('available'),
            runText: () =>
              Effect.succeed({ stdout: '', stderr: '', exitCode: 0 }),
            runJson: () =>
              Effect.fail(
                new AgyJsonError({
                  raw: 'not json',
                  cause: new SyntaxError('bad JSON'),
                })
              ),
          })
        )
      )
    )
  );

  it.effect('preserves non-zero AGY exit output in public run errors', () =>
    Effect.gen(function* () {
      const agy = yield* LocalAgyApi;
      const error = yield* Effect.flip(agy.runText({ prompt: 'fail' }));

      if (!(error instanceof AgyRunError)) {
        throw new Error(`Expected AgyRunError, got ${error._tag}`);
      }
      expect(error.exitCode).toBe(7);
      expect(error.stdout).toBe('partial');
      expect(error.stderr).toBe('denied');
    }).pipe(
      Effect.provide(LocalAgyApiLive),
      Effect.provide(
        Layer.succeed(
          Agy,
          Agy.of({
            status: () => Effect.succeed('available'),
            runText: () =>
              Effect.fail(
                new AgyExitError({
                  stdout: 'partial',
                  stderr: 'denied',
                  exitCode: 7,
                })
              ),
            runJson: () =>
              Effect.succeed({ value: {}, raw: '{}', stderr: '', exitCode: 0 }),
          })
        )
      )
    )
  );

  it.effect('builds the HTTP handler group from a fake AGY layer', () =>
    Effect.scoped(
      Layer.build(
        AgyHttpLive.pipe(Layer.provide(fakeLayer({ status: 'unavailable' })))
      ).pipe(Effect.asVoid)
    )
  );
});
