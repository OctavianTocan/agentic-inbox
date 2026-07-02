import { describe, expect, it } from '@effect/vitest';
import { Effect } from 'effect';
import { AiSdk, AiSdkError } from '../src';

describe('AiSdk', () => {
  it.effect('exposes an Effect v4 service layer', () =>
    Effect.gen(function* () {
      const ai = yield* AiSdk;

      expect(typeof ai.generateText).toBe('function');
      expect(typeof ai.streamText).toBe('function');
    }).pipe(Effect.provide(AiSdk.layer))
  );
});

describe('AiSdkError', () => {
  it('stores the operation and message', () => {
    const error = new AiSdkError({
      operation: 'generateText',
      message: 'provider failed'
    });

    expect(error._tag).toBe('AiSdkError');
    expect(error.operation).toBe('generateText');
    expect(error.message).toBe('provider failed');
  });
});
