import * as Schema from 'effect/Schema';
import { describe, expect, it } from 'vitest';
import { Api } from '../../../src/Api';
import {
  AgyJsonRunResponse,
  AgyRunRequest,
  AgyStatus,
  AgyTextRunResponse,
} from '../../../src/Modules/Agy/Domain';
import { AgyRpcs } from '../../../src/Modules/Agy/RpcProtocol';
import { RpcProtocol } from '../../../src/RpcProtocol';

describe('AGY API/RPC contracts', () => {
  it('decodes AGY status values', () => {
    expect(Schema.decodeUnknownSync(AgyStatus)('available')).toBe('available');
    expect(Schema.decodeUnknownSync(AgyStatus)('unavailable')).toBe(
      'unavailable'
    );
    expect(() => Schema.decodeUnknownSync(AgyStatus)('maybe')).toThrow();
  });

  it('decodes run requests aligned with the effect service', () => {
    const decoded = Schema.decodeUnknownSync(AgyRunRequest)({
      prompt: 'inspect the repo',
      cwd: '/tmp/project',
      model: 'gpt-5.3-codex-spark',
      sandbox: 'workspace-write',
      addDirs: ['/tmp/shared'],
      timeout: '30s',
    });

    expect(decoded).toEqual({
      prompt: 'inspect the repo',
      cwd: '/tmp/project',
      model: 'gpt-5.3-codex-spark',
      sandbox: 'workspace-write',
      addDirs: ['/tmp/shared'],
      timeout: '30s',
    });
  });

  it('decodes text and JSON run responses aligned with the effect service', () => {
    expect(
      Schema.decodeUnknownSync(AgyTextRunResponse)({
        stdout: 'done',
        stderr: '',
        exitCode: 0,
      })
    ).toEqual({
      stdout: 'done',
      stderr: '',
      exitCode: 0,
    });

    expect(
      Schema.decodeUnknownSync(AgyJsonRunResponse)({
        value: { ok: true },
        raw: '{"ok":true}',
        stderr: '',
        exitCode: 0,
      })
    ).toEqual({
      value: { ok: true },
      raw: '{"ok":true}',
      stderr: '',
      exitCode: 0,
    });
  });

  it('exports stable HTTP and RPC root contracts', () => {
    expect(Object.keys(Api.groups)).toEqual(['agy']);
    expect(RpcProtocol).toBe(AgyRpcs);
    expect(Array.from(AgyRpcs.requests.keys())).toEqual([
      'agy.status',
      'agy.runText',
      'agy.runJson',
    ]);
  });
});
