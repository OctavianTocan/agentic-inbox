import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { InboxShell } from '@/components/inbox/inbox-shell';
import { hasSeenInbox, markInboxSeen } from '@/components/inbox/session-state';
import { DesignSystemProvider } from '@/design-system/providers';

vi.mock('@/design-system/hooks/use-mobile', async () => {
  const actual = await vi.importActual<
    typeof import('@/design-system/hooks/use-mobile')
  >('@/design-system/hooks/use-mobile');
  return { ...actual, useIsMobile: () => false };
});

// Untriaged snapshot: no decisions, so summary.processed === 0 — the state that
// makes the run screen appear on a fresh load.
vi.mock('@/lib/inbox/client', async () => {
  const { buildMockInbox } = await import('@/lib/inbox/mock');
  const base = buildMockInbox();
  const untriaged = {
    items: base.items.map((item) => ({
      ...item,
      decision: null,
      actions: [],
      pendingApproval: null,
      status: 'needs_attention' as const
    })),
    summary: {
      processed: 0,
      handled: 0,
      needsAttention: base.items.length,
      filed: 0
    }
  };
  return {
    inboxClient: {
      getInbox: () => Promise.resolve(untriaged),
      runTriage: async function* () {
        yield { type: 'done', processed: untriaged.items.length };
      },
      resolveApproval: () => Promise.resolve(untriaged),
      undoAction: () => Promise.resolve(untriaged),
      retriage: () => Promise.resolve(untriaged)
    }
  };
});

vi.mock('@/components/inbox/run-view', () => ({
  RunView: () => (
    <section>
      <h1>Run the agent across the inbox?</h1>
    </section>
  )
}));

afterEach(cleanup);

function renderInboxShell() {
  return render(
    <DesignSystemProvider>
      <InboxShell />
    </DesignSystemProvider>
  );
}

describe('InboxShell run-screen gate', () => {
  it('shows the run screen on a fresh load of an untriaged inbox', async () => {
    // Simulate a hard reload: the in-memory "seen" flag starts unset.
    expect(hasSeenInbox()).toBe(false);

    renderInboxShell();

    expect(
      await screen.findByText('Run the agent across the inbox?')
    ).toBeDefined();
  });

  it('does not mount the shell alongside the run screen on a fresh untriaged load', async () => {
    // The run screen replaces the shell rather than layering over it, so the
    // sidebar is absent whenever the run screen is showing. Frame-level
    // no-flash behaviour during loading is covered by the Playwright probe.
    expect(hasSeenInbox()).toBe(false);

    renderInboxShell();

    await screen.findByText('Run the agent across the inbox?');
    expect(screen.queryByLabelText('Hide sidebar')).toBeNull();
  });

  it('skips the run screen once the inbox has been seen this session, even while untriaged', async () => {
    // Standing in for Audit -> Inbox client navigation: the module-scoped flag
    // persists across the remount, so the run screen must not reappear.
    markInboxSeen();
    expect(hasSeenInbox()).toBe(true);

    renderInboxShell();

    await waitFor(() => {
      expect(screen.getByLabelText('Hide sidebar')).toBeDefined();
    });
    expect(screen.queryByText('Run the agent across the inbox?')).toBeNull();
  });
});
