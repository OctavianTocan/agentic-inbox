import type { Email, Inbox, InboxItem, InboxSummary } from './types';

const emails = {
  'e-001': {
    id: 'e-001',
    from: 'Mira Patel <mira@paperbirch.example>',
    to: ['inbox@paperbirch.example'],
    cc: [],
    subject: 'Question about the moon journal restock',
    body: 'Do you know when the moon journal will be back in stock?',
    timestamp: '2026-05-13T14:30:00Z',
    inReplyTo: null
  },
  'e-002': {
    id: 'e-002',
    from: 'Studio Notes <updates@paperbirch.example>',
    to: ['inbox@paperbirch.example'],
    cc: [],
    subject: 'Tuesday studio update',
    body: 'Forty-eight card sets were packed and no issues were reported.',
    timestamp: '2026-05-13T15:00:00Z',
    inReplyTo: null
  },
  'e-003': {
    id: 'e-003',
    from: 'Northwind Paper <orders@northwind.example>',
    to: ['inbox@paperbirch.example'],
    cc: [],
    subject: 'Cotton paper availability',
    body: 'The requested cotton paper is available with a seven-day lead time.',
    timestamp: '2026-05-13T15:12:00Z',
    inReplyTo: null
  },
  'e-014': {
    id: 'e-014',
    from: 'Elena Ford <elena@customer.example>',
    to: ['inbox@paperbirch.example'],
    cc: [],
    subject: 'Duplicate card charge on order PB-4793',
    body: 'My card was charged twice. Please have someone review the payment record.',
    timestamp: '2026-05-13T19:15:00Z',
    inReplyTo: null
  },
  'e-016': {
    id: 'e-016',
    from: 'Avery Lin <avery@paperbirch.example>',
    to: ['inbox@paperbirch.example'],
    cc: [],
    subject: 'Safety incident at the print studio',
    body: 'A guest cut their hand on a paper trimmer. The station is closed pending inspection.',
    timestamp: '2026-05-13T19:45:00Z',
    inReplyTo: null
  }
} satisfies Record<string, Email>;

const items: readonly InboxItem[] = [
  {
    email: emails['e-016'],
    status: 'needs_attention',
    decision: {
      emailId: 'e-016',
      category: 'safety',
      severity: 'critical',
      confidence: 0.97,
      whyPreview: 'Studio injury report needs human review',
      rationale:
        'A guest was injured at the print studio. Safety reports are always held for a human review before any response is sent.',
      keyFacts: ['Guest injury reported', 'Paper trimmer removed from use'],
      isSensitive: true,
      policyReasons: []
    },
    pendingApproval: {
      id: 'ap-016',
      emailId: 'e-016',
      action: 'send_reply',
      actionRevision: 1,
      summary: 'Acknowledge the incident and request the inspection record',
      payload: {
        body: 'Thank you for the report. Please keep the station closed and send the inspection record when it is ready.'
      },
      createdAt: '2026-05-13T20:00:00Z'
    },
    actions: []
  },
  {
    email: emails['e-014'],
    status: 'needs_attention',
    decision: {
      emailId: 'e-014',
      category: 'financial',
      severity: 'high',
      confidence: 0.94,
      whyPreview: 'Duplicate charge needs payment review',
      rationale:
        'A customer reported a duplicate charge. Financial requests are held for a human review before an adjustment is promised.',
      keyFacts: ['Order PB-4793', 'Possible duplicate card charge'],
      isSensitive: true,
      policyReasons: []
    },
    pendingApproval: {
      id: 'ap-014',
      emailId: 'e-014',
      action: 'send_reply',
      actionRevision: 1,
      summary:
        'Acknowledge the payment concern without promising an adjustment',
      payload: {
        body: 'Thanks for flagging this. We are reviewing the payment record and will follow up once it is confirmed.'
      },
      createdAt: '2026-05-13T20:05:00Z'
    },
    actions: []
  },
  {
    email: emails['e-001'],
    status: 'done_for_you',
    decision: {
      emailId: 'e-001',
      category: 'request',
      severity: 'low',
      confidence: 0.89,
      whyPreview: 'Restock question answered with a notification offer',
      rationale:
        'This is a routine product question. The agent replied with the expected restock window and offered a restock notification.',
      keyFacts: ['Moon journal', 'Customer requested two copies'],
      isSensitive: false,
      policyReasons: []
    },
    pendingApproval: null,
    actions: [
      {
        id: 'le-001-reply',
        runId: null,
        actor: 'batch_agent',
        emailId: 'e-001',
        action: 'send_reply',
        actionRevision: 1,
        summary: 'Sent moon journal restock reply',
        payload: {
          body: 'Thanks for asking. We will send a restock notice as soon as the journals return.'
        },
        undoneBy: null,
        undoes: null,
        createdAt: '2026-05-13T14:35:00Z'
      }
    ]
  },
  {
    email: emails['e-003'],
    status: 'done_for_you',
    decision: {
      emailId: 'e-003',
      category: 'supplier_update',
      severity: 'low',
      confidence: 0.81,
      whyPreview: 'Supplier availability acknowledged without commitment',
      rationale:
        'The supplier confirmed availability and a lead time. The agent acknowledged receipt without placing an order.',
      keyFacts: ['300 gsm cotton paper', 'Seven-business-day lead time'],
      isSensitive: false,
      policyReasons: []
    },
    pendingApproval: null,
    actions: [
      {
        id: 'le-003-reply',
        runId: null,
        actor: 'batch_agent',
        emailId: 'e-003',
        action: 'send_reply',
        actionRevision: 1,
        summary: 'Acknowledged supplier availability',
        payload: {
          body: 'Thanks for the availability update. We will confirm if we need a reservation.'
        },
        undoneBy: null,
        undoes: null,
        createdAt: '2026-05-13T15:20:00Z'
      }
    ]
  },
  {
    email: emails['e-002'],
    status: 'filed',
    decision: {
      emailId: 'e-002',
      category: 'activity_update',
      severity: 'low',
      confidence: 0.96,
      whyPreview: 'Routine studio update filed for reference',
      rationale:
        'The update reports normal studio activity with no follow-up needed, so it was filed for reference.',
      keyFacts: ['Forty-eight card sets packed', 'No issues reported'],
      isSensitive: false,
      policyReasons: []
    },
    pendingApproval: null,
    actions: [
      {
        id: 'le-002-archive',
        runId: null,
        actor: 'batch_agent',
        emailId: 'e-002',
        action: 'archive',
        actionRevision: 1,
        summary: 'Filed Tuesday studio update',
        payload: {},
        undoneBy: null,
        undoes: null,
        createdAt: '2026-05-13T15:05:00Z'
      }
    ]
  }
];

function summarize(list: readonly InboxItem[]): InboxSummary {
  return {
    processed: list.filter((item) => item.decision !== null).length,
    handled: list.filter((item) => item.status === 'done_for_you').length,
    needsAttention: list.filter((item) => item.status === 'needs_attention')
      .length,
    filed: list.filter((item) => item.status === 'filed').length
  };
}

/** Fixture inbox for Storybook / tests when the API is unavailable. */
export function buildMockInbox(): Inbox {
  return {
    summary: summarize(items),
    items: items.map((item) => ({ ...item }))
  };
}

/** Re-export of the mock summary helper used by inbox UI tests. */
export { summarize as summarizeInbox };
