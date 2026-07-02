import * as Effect from 'effect/Effect';
import { describe, expect, it } from 'vitest';
import {
  DEFAULT_HOST,
  DEFAULT_PORT,
  formatConfigError,
  InvalidPortError,
  parsePort,
  parseServerConfig,
  serverOrigin,
  UnsafeBindHostError,
} from '../../src/Config';

describe('API server config', () => {
  it('defaults to a local host and fixed port', () => {
    expect(Effect.runSync(parseServerConfig({}))).toEqual({
      hostname: DEFAULT_HOST,
      port: DEFAULT_PORT,
    });
  });

  it('accepts loopback hosts only', () => {
    expect(
      Effect.runSync(parseServerConfig({ host: 'localhost', port: '5000' }))
    ).toEqual({
      hostname: 'localhost',
      port: 5000,
    });

    const result = Effect.runSyncExit(parseServerConfig({ host: '0.0.0.0' }));
    expect(result._tag).toBe('Failure');
    if (result._tag === 'Failure') {
      expect(result.cause.toString()).toContain('UnsafeBindHostError');
    }
  });

  it('converges to the same config across repeated parses', () => {
    const env = { host: '::1', port: '4898' };

    expect(Effect.runSync(parseServerConfig(env))).toEqual(
      Effect.runSync(parseServerConfig(env))
    );
  });

  it('rejects invalid ports', () => {
    expect(Effect.runSync(parsePort('65535'))).toBe(65_535);

    const result = Effect.runSyncExit(parsePort('65536'));
    expect(result._tag).toBe('Failure');
    if (result._tag === 'Failure') {
      expect(result.cause.toString()).toContain('InvalidPortError');
    }
  });

  it('exports typed config errors', () => {
    expect(new UnsafeBindHostError({ host: '0.0.0.0' }).host).toBe('0.0.0.0');
    expect(new InvalidPortError({ value: 'nope' }).value).toBe('nope');
  });

  it('formats origins and startup errors for agent-visible output', () => {
    expect(serverOrigin({ hostname: '127.0.0.1', port: 4897 })).toBe(
      'http://127.0.0.1:4897'
    );
    expect(
      formatConfigError(new UnsafeBindHostError({ host: '0.0.0.0' }))
    ).toBe('Refusing to bind {{SCOPE}} API to non-local host 0.0.0.0.');
  });
});
