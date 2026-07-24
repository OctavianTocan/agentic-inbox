import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor
} from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DetailPane } from '@/components/inbox/detail-pane';
import { EmailRow } from '@/components/inbox/email-row';
import { EMPTY_FILTERS, type InboxFilters } from '@/components/inbox/filters';
import { DesignSystemProvider } from '@/design-system/providers';
import type { InboxItem, LedgerEntry } from '@/lib/inbox/types';

const writeText = vi.fn(() => Promise.resolve());

beforeEach(() => {
  writeText.mockClear();
  Object.defineProperty(navigator, 'clipboard', {
    configurable: true,
    value: { writeText }
  });
});

afterEach(cleanup);

const baseEmail = {
  id: 'e-042',
  from: 'Casey Wu <casey@paperbirch.example>',
  to: ['pm@firm.com'],
  cc: [],
  subject: 'Question about moon journal restock',
  body: 'Please confirm the expected restock date.',
  timestamp: '2026-05-14T10:00:00Z',
  inReplyTo: null
} as const;

const pendingItem: InboxItem = {
  email: baseEmail,
  status: 'needs_attention',
  classification: {
    emailId: 'e-042',
    category: 'request',
    severity: 'high',
    confidence: 0.9,
    whyPreview: 'Customer request needing a reply.',
    rationale: 'Routine customer request.',
    keyFacts: [],
    isSensitive: false,
    policyReasons: []
  },
  pendingApproval: {
    id: 'a-042',
    emailId: 'e-042',
    action: 'send_reply',
    actionRevision: 1,
    summary: 'Reply with the pour date.',
    payload: {},
    createdAt: '2026-05-14T10:05:00Z'
  },
  actions: []
};

const plainItem: InboxItem = {
  ...pendingItem,
  status: 'done_for_you',
  pendingApproval: null
};

const pendingWithDraft: InboxItem = {
  ...pendingItem,
  pendingApproval: {
    id: 'a-042',
    emailId: 'e-042',
    action: 'send_reply',
    actionRevision: 1,
    summary: 'Reply with the pour date.',
    payload: { body: 'Agent drafted reply about the pour date.' },
    createdAt: '2026-05-14T10:05:00Z'
  }
};

const deferral: LedgerEntry = {
  id: 'l-defer-042',
  runId: null,
  actor: 'batch_agent',
  emailId: 'e-042',
  action: 'flag_for_review',
  actionRevision: 1,
  summary: 'Billing request needs a human review.',
  payload: {},
  undoneBy: null,
  undoes: null,
  createdAt: '2026-05-14T10:07:00Z'
};

const activeAction: LedgerEntry = {
  id: 'l-042',
  runId: null,
  actor: 'batch_agent',
  emailId: 'e-042',
  action: 'send_reply',
  actionRevision: 1,
  summary: 'Sent the reply.',
  payload: {},
  undoneBy: null,
  undoes: null,
  createdAt: '2026-05-14T10:06:00Z'
};

type RowHandlers = {
  readonly onApprove?: (approvalId: string) => void;
  readonly onDeny?: (approvalId: string) => void;
  readonly onUndo?: (ledgerEntryId: string, emailId: string) => void;
  readonly onRetriage?: (emailId: string) => void;
  readonly onFiltersChange?: (filters: InboxFilters) => void;
};

/** Render a single row in isolation with the design-system providers. */
function renderRow(item: InboxItem, handlers: RowHandlers = {}) {
  return render(
    <DesignSystemProvider>
      <EmailRow
        filters={EMPTY_FILTERS}
        isDimmed={false}
        isSelected={false}
        item={item}
        onApprove={handlers.onApprove ?? (() => undefined)}
        onDeny={handlers.onDeny ?? (() => undefined)}
        onFiltersChange={handlers.onFiltersChange ?? (() => undefined)}
        onRetriage={handlers.onRetriage ?? (() => undefined)}
        onSelect={() => undefined}
        onUndo={handlers.onUndo ?? (() => undefined)}
      />
    </DesignSystemProvider>
  );
}

/** Open a row's context menu by right-clicking its trigger element. */
function openRowMenu(container: HTMLElement) {
  const row = container.querySelector('[data-email-id]');
  expect(row).not.toBeNull();
  if (row) {
    fireEvent.contextMenu(row);
  }
}

describe('EmailRow context menu', () => {
  it('keeps data-email-id on the outermost element so the shell deselect check still resolves the row', () => {
    const { container } = renderRow(plainItem);

    const inner = container.querySelector('[data-slot="item-content"]');
    expect(inner).not.toBeNull();
    expect(
      inner?.closest('[data-email-id]')?.getAttribute('data-email-id')
    ).toBe('e-042');
  });

  it('exposes Approve and a destructive Deny only when an approval is pending', async () => {
    const { container } = renderRow(pendingItem);
    openRowMenu(container);

    const approve = await screen.findByRole('menuitem', { name: /Approve/ });
    const deny = await screen.findByRole('menuitem', { name: /Deny/ });
    expect(approve).toBeDefined();
    expect(deny.getAttribute('data-variant')).toBe('destructive');
  });

  it('omits Approve and Deny when nothing is pending', async () => {
    const { container } = renderRow(plainItem);
    openRowMenu(container);

    await screen.findByRole('menuitem', { name: /Copy subject/ });
    expect(screen.queryByRole('menuitem', { name: /Approve/ })).toBeNull();
    expect(screen.queryByRole('menuitem', { name: /Deny/ })).toBeNull();
  });

  it('shows inline Approve and Deny buttons on a pending row and fires the right handler', () => {
    const onApprove = vi.fn();
    const onDeny = vi.fn();
    renderRow(pendingItem, { onApprove, onDeny });

    const approveButton = screen.getAllByRole('button', {
      name: /Approve/
    })[0];
    if (approveButton === undefined) {
      throw new Error('pending row should render an Approve button');
    }
    expect(approveButton.closest('[data-slot="item-content"]')).not.toBeNull();

    fireEvent.click(approveButton);
    expect(onApprove).toHaveBeenCalledWith('a-042');

    const denyButton = screen.getAllByRole('button', { name: /Deny/ })[0];
    if (denyButton === undefined) {
      throw new Error('pending row should render a Deny button');
    }
    fireEvent.click(denyButton);
    expect(onDeny).toHaveBeenCalledWith('a-042');
  });

  it('shows no Approve or Deny buttons when nothing is pending', () => {
    renderRow(plainItem);
    expect(screen.queryByRole('button', { name: /Approve/ })).toBeNull();
    expect(screen.queryByRole('button', { name: /Deny/ })).toBeNull();
  });

  it('copies the subject and the email id to the clipboard from the menu', async () => {
    const { container } = renderRow(plainItem);
    openRowMenu(container);

    fireEvent.click(
      await screen.findByRole('menuitem', { name: /Copy subject/ })
    );
    await waitFor(() =>
      expect(writeText).toHaveBeenCalledWith(
        'Question about moon journal restock'
      )
    );

    openRowMenu(container);
    fireEvent.click(
      await screen.findByRole('menuitem', { name: /Copy email ID/ })
    );
    await waitFor(() => expect(writeText).toHaveBeenCalledWith('e-042'));
  });

  it('offers Undo and calls onUndo with the in-effect ledger entry, so a reviewer can reverse a handled row from the list', async () => {
    const onUndo = vi.fn();
    const { container } = renderRow(
      { ...plainItem, actions: [activeAction] },
      { onUndo }
    );
    openRowMenu(container);

    fireEvent.click(await screen.findByRole('menuitem', { name: /Undo/ }));
    expect(onUndo).toHaveBeenCalledWith('l-042', 'e-042');
  });

  it('hides Undo when the row has no in-effect action, so already-undone rows offer nothing to reverse', async () => {
    const { container } = renderRow(plainItem);
    openRowMenu(container);

    await screen.findByRole('menuitem', { name: /Copy subject/ });
    expect(screen.queryByRole('menuitem', { name: /Undo/ })).toBeNull();
  });

  it('offers Re-triage and calls onRetriage with the email id, so a reviewer can re-run one wrong call from the list', async () => {
    const onRetriage = vi.fn();
    const { container } = renderRow(plainItem, { onRetriage });
    openRowMenu(container);

    fireEvent.click(await screen.findByRole('menuitem', { name: /Re-triage/ }));
    expect(onRetriage).toHaveBeenCalledWith('e-042');
  });

  it('hides Re-triage for an untriaged row, so re-running only applies once a decision exists', async () => {
    const { container } = renderRow({
      ...plainItem,
      classification: null,
      status: 'needs_attention'
    });
    openRowMenu(container);

    await screen.findByRole('menuitem', { name: /Copy subject/ });
    expect(screen.queryByRole('menuitem', { name: /Re-triage/ })).toBeNull();
  });

  it('filters by the row severity so a right-click drills the list to matching items', async () => {
    const onFiltersChange = vi.fn();
    const { container } = renderRow(plainItem, { onFiltersChange });
    openRowMenu(container);

    fireEvent.click(await screen.findByRole('menuitem', { name: /Filter by/ }));
    fireEvent.click(
      await screen.findByRole('menuitem', { name: /Severity: high/ })
    );
    expect(onFiltersChange).toHaveBeenCalledWith({
      ...EMPTY_FILTERS,
      severity: 'high'
    });
  });
});

describe('EmailRow preview markdown', () => {
  it('flattens a markdown body (paragraphs and bullet lists) into one inline text flow so the clamped preview stays a couple of readable lines instead of raw unspaced source', () => {
    const markdownBody = [
      'Crews on site: 14 (concrete, MEP).',
      '',
      'Work completed:',
      '- SOG pour Bays 4-5 completed',
      '- Underground conduit 60% complete'
    ].join('\n');
    const { container } = renderRow({
      ...plainItem,
      classification: null,
      email: { ...baseEmail, body: markdownBody }
    });

    const desc = container.querySelector('[data-slot="item-description"]');
    expect(desc).not.toBeNull();
    // CSS white-space collapses the inter-block newlines to spaces; normalize
    // to assert what the reader actually sees.
    const rendered = (desc?.textContent ?? '').replace(/\s+/g, ' ').trim();
    // Content survives the flatten.
    expect(rendered).toContain('Crews on site: 14 (concrete, MEP).');
    // The raw markdown list marker is gone (parsed as a list, not shown as source).
    expect(rendered).not.toContain('- SOG');
    // Paragraphs and list items read as separated runs, not one mashed word.
    expect(rendered).toContain(
      'Work completed: SOG pour Bays 4-5 completed Underground conduit 60% complete'
    );
  });

  it('renders whyPreview through the same inline pipeline when a decision exists', () => {
    const { container } = renderRow(plainItem);
    const desc = container.querySelector('[data-slot="item-description"]');
    expect(desc?.textContent).toContain('Customer request needing a reply.');
  });
});

type DetailHandlers = {
  readonly onApprove?: (approvalId: string, editedBody?: string) => void;
  readonly onDeny?: (approvalId: string) => void;
  readonly onUndo?: (ledgerEntryId: string, emailId: string) => void;
};

/** Render the detail pane in isolation with the design-system providers. */
function renderDetail(item: InboxItem, handlers: DetailHandlers = {}) {
  return render(
    <DesignSystemProvider>
      <DetailPane
        item={item}
        onApprove={handlers.onApprove ?? (() => undefined)}
        onDeny={handlers.onDeny ?? (() => undefined)}
        onUndo={handlers.onUndo ?? (() => undefined)}
        thread={[]}
      />
    </DesignSystemProvider>
  );
}

/** Open the detail pane's email-body context menu. */
function openDetailMenu(container: HTMLElement) {
  const trigger = container.querySelector('[data-slot="context-menu-trigger"]');
  expect(trigger).not.toBeNull();
  if (trigger) {
    fireEvent.contextMenu(trigger);
  }
}

describe('DetailPane context menu', () => {
  it('offers Undo only when the item has an in-effect action', async () => {
    const { container } = renderDetail({
      ...plainItem,
      actions: [activeAction]
    });
    openDetailMenu(container);

    expect(await screen.findByRole('menuitem', { name: /Undo/ })).toBeDefined();
  });

  it('hides Undo when no active ledger entry exists', async () => {
    const { container } = renderDetail(plainItem);
    openDetailMenu(container);

    await screen.findByRole('menuitem', { name: /Copy subject/ });
    expect(screen.queryByRole('menuitem', { name: /Undo/ })).toBeNull();
  });

  it('leaves the email body text-selectable despite the context-menu trigger', () => {
    const { container } = renderDetail(plainItem);

    const trigger = container.querySelector(
      '[data-slot="context-menu-trigger"]'
    );
    expect(trigger?.className).toContain('select-text');
    expect(trigger?.className).not.toContain('select-none');
  });
});

describe('DetailPane approval affordances', () => {
  it('renders the agent draft in an editable textarea so the reviewer can act on it themselves', () => {
    renderDetail(pendingWithDraft);

    const textarea = screen.getByRole('textbox');
    expect(textarea instanceof HTMLTextAreaElement).toBe(true);
    if (textarea instanceof HTMLTextAreaElement) {
      expect(textarea.value).toBe('Agent drafted reply about the pour date.');
      expect(textarea.readOnly).toBe(false);
    }
  });

  it('approves with the reviewer-edited body, not the agent draft, so the send carries the human text', () => {
    const onApprove = vi.fn();
    renderDetail(pendingWithDraft, { onApprove });

    const textarea = screen.getByRole('textbox');
    fireEvent.change(textarea, {
      target: { value: 'Human-edited reply: pour date is May 20.' }
    });
    fireEvent.click(screen.getByRole('button', { name: /Submit edited/ }));

    expect(onApprove).toHaveBeenCalledWith(
      'a-042',
      'Human-edited reply: pour date is May 20.'
    );
  });

  it('approves with no edited body when the draft is left untouched, so an unchanged accept sends the agent draft', () => {
    const onApprove = vi.fn();
    renderDetail(pendingWithDraft, { onApprove });

    fireEvent.click(screen.getByRole('button', { name: /Accept/ }));
    expect(onApprove).toHaveBeenCalledWith('a-042', undefined);
  });

  it('denies the pending approval from the card, so a wrong proposal is cheaply rejected', () => {
    const onDeny = vi.fn();
    renderDetail(pendingWithDraft, { onDeny });

    fireEvent.click(screen.getByRole('button', { name: /Deny/ }));
    expect(onDeny).toHaveBeenCalledWith('a-042');
  });
});

describe('DetailPane deferral framing', () => {
  it('frames a flag_for_review entry as deferred, not as a completed action', () => {
    renderDetail({
      ...plainItem,
      status: 'needs_attention',
      actions: [deferral]
    });

    // A deferral is surfaced as held-for-you work, not under "What the agent did".
    expect(screen.getByText(/Deferred to you/)).toBeDefined();
    expect(screen.getByText(/Why the agent did not act/)).toBeDefined();
    expect(screen.queryByText('What the agent did')).toBeNull();
  });

  it('keeps a completed action under "What the agent did", distinct from deferrals', () => {
    renderDetail({ ...plainItem, actions: [activeAction] });

    expect(screen.getByText('What the agent did')).toBeDefined();
    expect(screen.queryByText(/Deferred to you/)).toBeNull();
  });
});
