import { describe, expect, it } from 'vitest';
import { buildAgyArgs } from '@/Modules/Agy/Process';

describe('Agy Process', () => {
  it('builds status args from the stable AGY version flag', () => {
    expect(buildAgyArgs({ mode: 'status', prompt: '' })).toEqual(['--version']);
  });

  it('builds run args without fake flags', () => {
    expect(
      buildAgyArgs({
        mode: 'run',
        prompt: 'Summarize this',
        model: 'gpt-5',
        sandbox: 'workspace-write',
        addDirs: ['/tmp/a', '/tmp/b'],
        timeout: '2m',
      })
    ).toEqual([
      '--model',
      'gpt-5',
      '--sandbox',
      'workspace-write',
      '--add-dir',
      '/tmp/a',
      '--add-dir',
      '/tmp/b',
      '--print-timeout',
      '2m',
      '--print',
      'Summarize this',
    ]);
  });

  it('omits absent optional flags for the minimal print command', () => {
    expect(buildAgyArgs({ mode: 'run', prompt: 'hello' })).toEqual([
      '--print',
      'hello',
    ]);
  });
});
