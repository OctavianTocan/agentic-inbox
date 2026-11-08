import { describe, expect, it } from 'vitest';
import { loadDynamicFragments } from '../src/dynamic-fragments';

const FIXTURE_ROOT = decodeURIComponent(
  new URL('../e2e-test', import.meta.url).pathname
);

describe('dynamic skill fragments', (): void => {
  it('returns no fragments when no dynamic sources are registered', async (): Promise<void> => {
    const fragments = await loadDynamicFragments(FIXTURE_ROOT);

    expect(fragments).toEqual([]);
  });
});
