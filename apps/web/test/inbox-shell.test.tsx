import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { InboxShell } from '@/components/inbox/inbox-shell';
import { DesignSystemProvider } from '@/design-system/providers';

vi.mock('@/lib/inbox/client', async () => {
  const { buildMockInbox } = await import('@/lib/inbox/mock');
  const inbox = buildMockInbox();
  return {
    inboxClient: {
      getInbox: () => Promise.resolve(inbox),
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
    readonly onComplete: () => void;
  }) => (
    <section>
      <h1>Triaging your inbox</h1>
      {items.map((item) => (
        <p key={item.email.subject}>{item.email.subject}</p>
      ))}
      <button onClick={onComplete} type="button">
        Finish run
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
  it('shows the run view first, then the populated inbox with percentage panel sizes', async () => {
    const { container } = renderInboxShell();

    expect(screen.getByText('Triaging your inbox')).toBeDefined();
    expect(screen.queryByText('No emails match these filters.')).toBeNull();

    expect(
      await screen.findByText(
        /INCIDENT REPORT - Bay Street - fall arrest anchor/
      )
    ).toBeDefined();

    fireEvent.click(screen.getByText('Finish run'));

    expect(screen.queryByText('Triaging your inbox')).toBeNull();
    expect(screen.getByText('Awaiting your approval')).toBeDefined();
    expect(
      screen.getAllByText(/RFI-187: Lobby east wall finish at Riverside Tower/)
        .length
    ).toBeGreaterThan(0);

    const panelStyles = Array.from(
      container.querySelectorAll('[data-panel]')
    ).map((panel) => panel.getAttribute('style') ?? '');

    expect(panelStyles[0]).toContain('flex: 40 1 0px');
    expect(panelStyles[1]).toContain('flex: 60 1 0px');
  });
});
