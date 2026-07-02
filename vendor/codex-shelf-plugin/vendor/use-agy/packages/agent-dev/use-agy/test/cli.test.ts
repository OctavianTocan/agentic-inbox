import { spawnSync } from 'node:child_process';
import { describe, expect, it } from 'vitest';

const cli = ['run', 'bin/use-agy'];

/**
 * Runs the local CLI binary in a subprocess.
 *
 * @param args - CLI arguments after `use-agy`.
 * @returns Captured subprocess result.
 */
const runCli = (...args: ReadonlyArray<string>) =>
  spawnSync('bun', [...cli, ...args], {
    cwd: new URL('../../../..', import.meta.url),
    encoding: 'utf8',
  });

describe('use-agy CLI', () => {
  it('renders help to stdout', () => {
    const result = runCli('--help');

    expect(result.status).toBe(0);
    expect(result.stdout).toContain('use-agy');
    expect(result.stdout).toContain('doctor');
    expect(result.stderr).toBe('');
  });

  it('prints doctor status as JSON only on stdout', () => {
    const result = runCli('doctor', '--json');

    expect(result.status).toBe(0);
    expect(result.stderr).toBe('');
    expect(JSON.parse(result.stdout)).toEqual({
      agy: { status: expect.stringMatching(/^(available|unavailable)$/) },
    });
  });

  it('prints doctor status as a plain token', () => {
    const result = runCli('doctor', '--plain');

    expect(result.status).toBe(0);
    expect(result.stderr).toBe('');
    expect(result.stdout.trim()).toMatch(/^(available|unavailable)$/);
  });

  it('rejects conflicting output modes without contaminating stdout', () => {
    const result = runCli('doctor', '--json', '--plain');

    expect(result.status).toBe(2);
    expect(result.stdout).toBe('');
    expect(result.stderr).toContain('error: Choose only one output mode.');
  });

  it('rejects run text output-mode conflicts before invoking AGY', () => {
    const result = runCli('run', 'text', 'ignored', '--json', '--plain');

    expect(result.status).toBe(2);
    expect(result.stdout).toBe('');
    expect(result.stderr).toContain('error: Choose only one output mode.');
  });

  it('renders run text help without executing AGY', () => {
    const result = runCli('run', 'text', '--help');

    expect(result.status).toBe(0);
    expect(result.stdout).toContain('prompt');
    expect(result.stdout).toContain('--add-dir');
    expect(result.stderr).toBe('');
  });
});
