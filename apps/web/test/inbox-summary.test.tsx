import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { InboxSummaryBlock } from '@/components/inbox/inbox-summary';
import { DesignSystemProvider } from '@/design-system/providers';
import type { InboxItem, InboxSummary } from '@/lib/inbox/types';

const triagedItem: InboxItem = {
  email: {
    id: 'e-001',
    from: 'Casey Wu <casey@paperbirch.example>',
    to: ['pm@firm.com'],
    cc: [],
    subject: 'Question about moon journal delivery',
    body: 'Please confirm the delivery date.',
    timestamp: '2026-05-14T10:00:00Z',
    inReplyTo: null
  },
  status: 'done_for_you',
  classification: {
    emailId: 'e-001',
    category: 'request',
    severity: 'high',
    confidence: 0.9,
    whyPreview: 'Routine customer request',
    rationale: 'Standard customer request.',
    keyFacts: [],
    isSensitive: false,
    policyReasons: []
  },
  pendingApproval: null,
  actions: []
};

const summary: InboxSummary = {
  processed: 1,
  handled: 1,
  needsAttention: 0,
  filed: 0
};

/** Render the summary block with the design-system providers. */
function renderSummary(items: readonly InboxItem[], value: InboxSummary) {
  return render(
    <DesignSystemProvider>
      <InboxSummaryBlock isLoading={false} items={items} summary={value} />
    </DesignSystemProvider>
  );
}

describe('InboxSummaryBlock content', () => {
  it('renders the collapsible prose summary without chip rows, which would duplicate the sidebar filters', () => {
    renderSummary([triagedItem], summary);

    expect(screen.getByRole('button', { name: /at a glance/i })).toBeDefined();
    expect(screen.getByText(/The agent reviewed 1 emails/)).toBeDefined();
    expect(screen.queryByText('Paper Birch Studio')).toBeNull();
    expect(screen.queryByText('high')).toBeNull();
  });
});
