import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useInbox } from '@/components/inbox/use-inbox';
import type { InboxClient } from '@/lib/inbox/client';
import { buildMockInbox } from '@/lib/inbox/mock';
import type { Inbox, TriageRunEvent } from '@/lib/inbox/types';

vi.mock('sonner', () => ({
  toast: vi.fn()
}));

afterEach(cleanup);

/** Empty triage stream for hook tests that do not exercise triage. */
async function* emptyTriageRun(): AsyncIterable<TriageRunEvent> {}

/** Client defaults for hook tests. */
function makeClient(overrides: Partial<InboxClient>): InboxClient {
  const inbox = buildMockInbox();
  return {
    getInbox: () => Promise.resolve(inbox),
    runTriage: emptyTriageRun,
    resolveApproval: () => Promise.resolve(inbox),
    undoAction: () => Promise.resolve(inbox),
    retriage: () => Promise.resolve(inbox),
    ...overrides
  };
}

/** Promise plus resolver for tests that need to hold an async operation open. */
function deferred<T>(): {
  readonly promise: Promise<T>;
  readonly resolve: (value: T) => void;
} {
  let resolveValue: ((value: T) => void) | undefined;
  const promise = new Promise<T>((resolve) => {
    resolveValue = resolve;
  });
  if (resolveValue === undefined) {
    throw new Error('deferred promise was not initialized');
  }
  return { promise, resolve: resolveValue };
}

describe('useInbox approval resolution', () => {
  it('ignores duplicate resolves for the same pending approval while one is in flight', async () => {
    const inbox = buildMockInbox();
    const pendingResolve = deferred<Inbox>();
    const resolveApproval = vi.fn(() => pendingResolve.promise);
    const client = makeClient({ resolveApproval });
    const { result } = renderHook(() => useInbox(client));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    const first = result.current.approve('id_duplicate');
    const second = result.current.approve('id_duplicate');

    expect(resolveApproval).toHaveBeenCalledTimes(1);
    await act(async () => {
      pendingResolve.resolve(inbox);
      await Promise.all([first, second]);
    });
  });

  it('refreshes the inbox when a stale approval id is already gone on the server', async () => {
    const getInbox = vi.fn(() => Promise.resolve(buildMockInbox()));
    const client = makeClient({
      getInbox,
      resolveApproval: () =>
        Promise.reject(new Error('{"_tag":"ApprovalNotFound"}'))
    });
    const { result } = renderHook(() => useInbox(client));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    await act(async () => {
      await result.current.approve('id_stale');
    });

    expect(getInbox).toHaveBeenCalledTimes(2);
  });
});
