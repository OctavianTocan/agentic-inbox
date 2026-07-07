import {
  act,
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

vi.mock('@/components/inbox/run-view', () => ({
  RunView: () => (
    <section>
      <h1>Run the agent across the inbox?</h1>
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

describe('InboxShell', () => {
  it('lands straight in the populated inbox for an already-triaged snapshot, skipping the run view', async () => {
    const { container } = renderInboxShell();

    expect(
      (
        await screen.findAllByText(
          /RFI-187: Lobby east wall finish at Riverside Tower/
        )
      ).length
    ).toBeGreaterThan(0);

    expect(screen.queryByText('Run the agent across the inbox?')).toBeNull();
    expect(
      screen.getAllByText('Awaiting your approval').length
    ).toBeGreaterThan(0);
    expect(screen.getByLabelText('Hide chat')).toBeDefined();
    expect(screen.queryByLabelText('Stop generating')).toBeNull();

    expect(screen.getByLabelText('Hide sidebar')).toBeDefined();
    expect(screen.queryByLabelText('Toggle Sidebar')).toBeNull();
    expect(screen.queryByText('Agentic Inbox')).toBeNull();
    const newChat = screen.getByLabelText('New chat');
    expect(newChat.getAttribute('aria-hidden')).toBe('true');

    // Nothing is selected on arrival: the detail pane is hidden and the list
    // owns the full center space until the user opens an email.
    expect(screen.queryByLabelText('Close email')).toBeNull();
    const panelStyles = Array.from(
      container.querySelectorAll('[data-panel]')
    ).map((panel) => panel.getAttribute('style') ?? '');
    expect(panelStyles).toHaveLength(1);

    const chatAside = container.querySelector('[data-slot="chat-slot"]');
    expect(chatAside?.getAttribute('data-state')).toBe('expanded');
  });

  it('opens the detail panel on email select and closes it from its header control', async () => {
    const { container } = renderInboxShell();

    await screen.findAllByText(
      /RFI-187: Lobby east wall finish at Riverside Tower/
    );

    // No detail panel until an email is opened.
    expect(screen.queryByLabelText('Close email')).toBeNull();

    const row = container.querySelector('[data-email-id]');
    expect(row).not.toBeNull();
    if (row) {
      fireEvent.click(row);
    }

    await waitFor(() => {
      expect(screen.getByLabelText('Close email')).toBeDefined();
    });

    fireEvent.click(screen.getByLabelText('Close email'));

    expect(
      container
        .querySelector('[data-slot="inbox-detail-panel"]')
        ?.getAttribute('data-state')
    ).toBe('closing');

    await waitFor(() => {
      expect(screen.queryByLabelText('Close email')).toBeNull();
    });
  });
});

describe('InboxShell mobile', () => {
  it('focuses the chat composer when the Ask agent bar opens the chat sheet', async () => {
    mobileState.isMobile = true;
    vi.useFakeTimers({ shouldAdvanceTime: true });
    try {
      renderInboxShell();

      await vi.waitFor(() => {
        expect(screen.getByText('Ask agent')).toBeDefined();
      });

      fireEvent.click(screen.getByText('Ask agent'));

      // Focus is driven off the open transition, past vaul's 500ms animation.
      await act(async () => {
        await vi.advanceTimersByTimeAsync(700);
      });

      await vi.waitFor(() => {
        expect(document.activeElement?.getAttribute('data-slot')).toBe(
          'composer-textarea'
        );
      });
    } finally {
      vi.useRealTimers();
    }
  });

  it('mounts the mobile top bar inside the overscroll-locked wrapper, not the scrollable list', async () => {
    mobileState.isMobile = true;
    const { container } = renderInboxShell();

    await screen.findByText('Ask agent');

    const askBar = screen.getByText('Ask agent');
    const lockedWrapper = container.querySelector('.overscroll-none');
    expect(lockedWrapper).not.toBeNull();

    const scrollRegion = lockedWrapper?.querySelector('.overflow-y-auto');
    expect(scrollRegion).not.toBeNull();
    // The bar must sit outside the scroll region so dragging it cannot scroll
    // it off-screen.
    expect(scrollRegion?.contains(askBar)).toBe(false);
    expect(lockedWrapper?.contains(askBar)).toBe(true);
  });
});
