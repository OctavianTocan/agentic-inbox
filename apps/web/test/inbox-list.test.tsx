import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { EMPTY_FILTERS } from '@/components/inbox/filters';
import { InboxList } from '@/components/inbox/inbox-list';
import { DesignSystemProvider } from '@/design-system/providers';
import type { InboxItem } from '@/lib/inbox/types';

const untriagedItem: InboxItem = {
  email: {
    id: 'e-untriaged',
    from: 'Casey Wu <c.wu@meridianarch.com>',
    to: ['pm@firm.com'],
    cc: [],
    subject: 'Weekly schedule ping — Riverside Tower',
    body: 'Any update on the level 4 pour date?',
    timestamp: '2026-05-14T10:00:00Z',
    inReplyTo: null
  },
  status: 'needs_attention',
  decision: null,
  pendingApproval: null,
  actions: []
};

type ListHandlers = {
  readonly hasSelection?: boolean;
  readonly onClearSelection?: () => void;
  readonly onToggleChat?: () => void;
};

/** Render the list in isolation with the design-system providers. */
function renderList(items: readonly InboxItem[], handlers: ListHandlers = {}) {
  return render(
    <DesignSystemProvider>
      <InboxList
        filters={EMPTY_FILTERS}
        hasSelection={handlers.hasSelection ?? false}
        items={items}
        onApprove={() => undefined}
        onClearSelection={handlers.onClearSelection ?? (() => undefined)}
        onDeny={() => undefined}
        onFiltersChange={() => undefined}
        onSelect={() => undefined}
        onToggleChat={handlers.onToggleChat ?? (() => undefined)}
        onUndo={() => undefined}
        selectedEmailId={null}
        sortKey="severity"
        viewedEmailIds={new Set()}
      />
    </DesignSystemProvider>
  );
}

/** Open the list's background context menu by right-clicking its container. */
function openBackgroundMenu(container: HTMLElement) {
  const trigger = container.querySelector('[data-slot="context-menu-trigger"]');
  expect(trigger).not.toBeNull();
  if (trigger) {
    fireEvent.contextMenu(trigger);
  }
}

describe('InboxList untriaged presentation', () => {
  it('shows untriaged emails quietly under a "Not triaged yet" section, without the needs-attention status', () => {
    renderList([untriagedItem]);

    expect(screen.getByText('Not triaged yet')).toBeDefined();
    expect(screen.getByText('Not triaged')).toBeDefined();
    expect(screen.queryByText('Needs attention')).toBeNull();
    expect(screen.queryByText('Inbox')).toBeNull();
  });
});

describe('InboxList background context menu', () => {
  it('always offers chat toggle and Audit navigation on empty list space', async () => {
    const { container } = renderList([untriagedItem]);
    openBackgroundMenu(container);

    expect(
      await screen.findByRole('menuitem', { name: /Toggle chat panel/ })
    ).toBeDefined();
    expect(screen.getByRole('menuitem', { name: /Go to Audit/ })).toBeDefined();
  });

  it('gates Clear selection on there being a selection, so nothing to clear stays hidden', async () => {
    const { container } = renderList([untriagedItem], { hasSelection: false });
    openBackgroundMenu(container);

    await screen.findByRole('menuitem', { name: /Toggle chat panel/ });
    expect(
      screen.queryByRole('menuitem', { name: /Clear selection/ })
    ).toBeNull();
  });

  it('offers Clear selection and calls onClearSelection when a row is selected', async () => {
    const onClearSelection = vi.fn();
    const { container } = renderList([untriagedItem], {
      hasSelection: true,
      onClearSelection
    });
    openBackgroundMenu(container);

    fireEvent.click(
      await screen.findByRole('menuitem', { name: /Clear selection/ })
    );
    expect(onClearSelection).toHaveBeenCalledOnce();
  });
});
