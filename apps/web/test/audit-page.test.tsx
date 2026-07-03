import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import * as sessionState from '@/components/inbox/session-state';
import type { UseInbox } from '@/components/inbox/use-inbox';
import { AuditPage } from '@/components/traces/trace-page';
import { DesignSystemProvider } from '@/design-system/providers';
import type { Inbox, InboxItem } from '@/lib/inbox/types';

const routerPush = vi.hoisted(() => vi.fn());

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: routerPush })
}));

const fakeItem: InboxItem = {
  email: {
    id: 'e-001',
    from: 'Priya Rao <priya@acme-mech.com>',
    to: ['pm@site.dev'],
    cc: [],
    subject: 'RFI-204 duct routing clash at Level 3',
    body: 'Please confirm the revised routing.',
    timestamp: '2026-07-01T09:00:00.000Z',
    inReplyTo: null
  },
  status: 'done_for_you',
  decision: {
    emailId: 'e-001',
    category: 'rfi',
    severity: 'low',
    confidence: 0.9,
    whyPreview: 'Routine RFI',
    rationale: 'Routine RFI with a documented answer, safe to auto-reply.',
    keyFacts: ['Clash at Level 3'],
    isSensitive: false
  },
  pendingApproval: null,
  actions: [
    {
      id: 'l-001',
      actor: 'batch_agent',
      emailId: 'e-001',
      action: 'send_reply',
      summary: 'Replied with the approved duct routing',
      payload: { to: 'priya@acme-mech.com' },
      undoneBy: null,
      undoes: null,
      createdAt: '2026-07-01T09:05:00.000Z'
    }
  ]
};

const populatedInbox: Inbox = {
  summary: { processed: 1, handled: 1, needsAttention: 0, filed: 0 },
  items: [fakeItem]
};

const emptyInbox: Inbox = {
  summary: { processed: 0, handled: 0, needsAttention: 0, filed: 0 },
  items: []
};

let current: Inbox | null = populatedInbox;

vi.mock('@/components/inbox/use-inbox', () => ({
  useInbox: (): UseInbox => ({
    inbox: current,
    isLoading: false,
    refresh: vi.fn(),
    runTriage: vi.fn(),
    approve: vi.fn(),
    deny: vi.fn(),
    undo: vi.fn(),
    retriage: vi.fn()
  })
}));

// The chat slot pulls in the AI composer/thread stack, which is irrelevant to
// the audit layout under test and heavy to mount.
vi.mock('@/components/inbox/chat-slot', () => ({
  ChatSlot: () => null
}));

vi.mock('@/components/inbox/inbox-shell', () => ({
  ChatPeek: () => null,
  SidebarPeek: () => null
}));

afterEach(cleanup);

/** Stub matchMedia and viewport width so `useIsMobile` resolves deterministically. */
function stubViewport(mobile: boolean) {
  Object.defineProperty(window, 'innerWidth', {
    configurable: true,
    value: mobile ? 390 : 1280
  });
  vi.stubGlobal('matchMedia', (query: string) => ({
    matches: mobile && query.includes('max-width'),
    media: query,
    onchange: null,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => false
  }));
}

beforeEach(() => {
  current = populatedInbox;
  stubViewport(false);
});

describe('AuditPage', () => {
  it('opens the detail in a side pane (not a bottom sheet) on desktop', async () => {
    stubViewport(false);
    render(
      <DesignSystemProvider>
        <AuditPage />
      </DesignSystemProvider>
    );

    // Nothing selected: the detail payload is not mounted, and there is no
    // dismiss control for a pane that does not exist yet.
    expect(screen.queryByText(/"to":/)).toBeNull();
    expect(screen.queryByLabelText('Close audit event')).toBeNull();

    const row = screen
      .getByText('Replied with the approved duct routing')
      .closest('[role="button"]');
    expect(row).not.toBeNull();
    if (row) {
      fireEvent.click(row);
    }

    // The desktop pane carries the same detail the old sheet did: rationale
    // plus raw payload, and a closable pane (never the mobile drawer).
    expect(
      await screen.findByText(
        'Routine RFI with a documented answer, safe to auto-reply.'
      )
    ).not.toBeNull();
    expect(screen.getByText(/"to": "priya@acme-mech.com"/)).not.toBeNull();
    expect(screen.getByLabelText('Close audit event')).not.toBeNull();
    expect(document.querySelector('[data-slot="drawer-content"]')).toBeNull();
  });

  it('opens the detail in a bottom sheet on mobile', async () => {
    stubViewport(true);
    render(
      <DesignSystemProvider>
        <AuditPage />
      </DesignSystemProvider>
    );

    const row = screen
      .getByText('Replied with the approved duct routing')
      .closest('[role="button"]');
    expect(row).not.toBeNull();
    if (row) {
      fireEvent.click(row);
    }

    // Mobile routes the same detail through the drawer sheet.
    expect(
      await screen.findByText(
        'Routine RFI with a documented answer, safe to auto-reply.'
      )
    ).not.toBeNull();
    expect(
      document.querySelector('[data-slot="drawer-content"]')
    ).not.toBeNull();
  });

  it('shows the empty-state count when the ledger has no events', () => {
    current = emptyInbox;
    render(
      <DesignSystemProvider>
        <AuditPage />
      </DesignSystemProvider>
    );

    expect(screen.getByText('0 audit events')).not.toBeNull();
  });

  it('signals a cross-page run-screen request and navigates to the inbox on Re-run triage', () => {
    const request = vi.spyOn(sessionState, 'requestRunView');
    render(
      <DesignSystemProvider>
        <AuditPage />
      </DesignSystemProvider>
    );

    fireEvent.click(screen.getByText('Re-run triage'));

    expect(request).toHaveBeenCalledTimes(1);
    expect(routerPush).toHaveBeenCalledWith('/');
    request.mockRestore();
    sessionState.clearRunViewRequest();
  });
});
