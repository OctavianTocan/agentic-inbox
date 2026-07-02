import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { InboxShell } from '@/components/inbox/inbox-shell';
import { DesignSystemProvider } from '@/design-system/providers';

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
      undoAction: () => Promise.resolve(inbox)
    }
  };
});

vi.mock('@/components/inbox/run-view', () => ({
  RunView: ({
    items,
    onComplete
  }: {
    readonly items: readonly { readonly email: { readonly subject: string } }[];
    readonly onComplete: () => Promise<void> | void;
  }) => (
    <section>
      <h1>Run the agent across the inbox?</h1>
      {items.map((item) => (
        <p key={item.email.subject}>{item.email.subject}</p>
      ))}
      <button onClick={() => void onComplete()} type="button">
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

describe('InboxShell', () => {
  it('shows the run view first, then the populated inbox with resizable list/detail/chat panels', async () => {
    const { container } = renderInboxShell();

    expect(screen.getByText('Run the agent across the inbox?')).toBeDefined();
    expect(screen.queryByText('No emails match these filters.')).toBeNull();

    expect(
      await screen.findByText(
        /INCIDENT REPORT - Bay Street - fall arrest anchor/
      )
    ).toBeDefined();

    fireEvent.click(screen.getByText('Open current inbox'));

    await waitFor(() => {
      expect(screen.queryByText('Run the agent across the inbox?')).toBeNull();
    });
    expect(
      screen.getAllByText('Awaiting your approval').length
    ).toBeGreaterThan(0);
    expect(
      screen.getAllByText(/RFI-187: Lobby east wall finish at Riverside Tower/)
        .length
    ).toBeGreaterThan(0);
    expect(screen.getByLabelText('Hide chat')).toBeDefined();
    expect(screen.queryByLabelText('Stop generating')).toBeNull();

    const panelStyles = Array.from(
      container.querySelectorAll('[data-panel]')
    ).map((panel) => panel.getAttribute('style') ?? '');

    expect(panelStyles[0]).toContain('flex: 30 1 0px');
    expect(panelStyles[1]).toContain('flex: 42 1 0px');
    expect(panelStyles[2]).toContain('flex: 28 1 0px');
  });
});
