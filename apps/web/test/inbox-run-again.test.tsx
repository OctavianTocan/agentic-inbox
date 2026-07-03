import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor
} from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { InboxShell } from '@/components/inbox/inbox-shell';
import { DesignSystemProvider } from '@/design-system/providers';

const mobileState = vi.hoisted(() => ({ isMobile: false }));

vi.mock('@/design-system/hooks/use-mobile', async () => {
  const actual = await vi.importActual<
    typeof import('@/design-system/hooks/use-mobile')
  >('@/design-system/hooks/use-mobile');
  return { ...actual, useIsMobile: () => mobileState.isMobile };
});

afterEach(() => {
  cleanup();
  mobileState.isMobile = false;
});

vi.mock('@/lib/inbox/client', async () => {
  const { buildMockInbox } = await import('@/lib/inbox/mock');
  const inbox = buildMockInbox();
  return {
    inboxClient: {
      getInbox: () => Promise.resolve(inbox),
      runTriage: async function* () {
        yield { type: 'done', processed: inbox.items.length };
      },
      resolveApproval: () => Promise.resolve(inbox),
      undoAction: () => Promise.resolve(inbox),
      retriage: () => Promise.resolve(inbox)
    }
  };
});

// Stand-in for the real run screen exposing the two exit affordances the
// caught-up state renders, so the test can assert navigation without driving
// the streaming triage endpoint.
vi.mock('@/components/inbox/run-view', () => ({
  RunView: ({ onComplete }: { onComplete: () => void }) => (
    <section>
      <h1>The inbox is all caught up</h1>
      <button onClick={() => onComplete()} type="button">
        Open current inbox
      </button>
    </section>
  )
}));

/** Render the inbox with the design-system providers it receives in Next. */
function renderInboxShell() {
  return render(
    <DesignSystemProvider>
      <InboxShell />
    </DesignSystemProvider>
  );
}

describe('InboxShell re-run entry point', () => {
  it('opens the run screen from the sidebar for a fully-triaged inbox and returns to it intact on Open current inbox', async () => {
    renderInboxShell();

    // A triaged snapshot lands straight in the populated inbox; the run screen
    // is not shown until the user asks for it.
    await screen.findAllByText(
      /RFI-187: Lobby east wall finish at Riverside Tower/
    );
    expect(screen.queryByText('The inbox is all caught up')).toBeNull();

    fireEvent.click(screen.getByText('Re-run triage'));

    await waitFor(() => {
      expect(screen.getByText('The inbox is all caught up')).toBeDefined();
    });
    // The inbox list is gone while the run screen owns the view.
    expect(
      screen.queryByText(/RFI-187: Lobby east wall finish at Riverside Tower/)
    ).toBeNull();

    fireEvent.click(screen.getByText('Open current inbox'));

    // Opening the current inbox returns to the shell without clearing triage:
    // the list is back and no re-triage was needed.
    await waitFor(() => {
      expect(
        screen.getAllByText(
          /RFI-187: Lobby east wall finish at Riverside Tower/
        ).length
      ).toBeGreaterThan(0);
    });
    expect(screen.queryByText('The inbox is all caught up')).toBeNull();
    expect(
      screen.getAllByText('Awaiting your approval').length
    ).toBeGreaterThan(0);
  });
});
