import { buildMockInbox, summarizeInbox } from './mock';
import type { ApprovalVerdict, Inbox, InboxItem, LedgerEntry } from './types';

/** Inputs for resolving a pending approval on a sensitive email. */
export type ResolveApprovalInput = {
  readonly verdict: ApprovalVerdict;
  /** Edited reply body to send instead of the agent draft when approving. */
  readonly editedBody?: string;
};

/**
 * Thin data seam between the inbox UI and its backing store. The mock
 * implementation mutates in-memory state; wave 3 swaps in an HTTP client
 * against `/inbox`, `/approvals/:id`, and `/actions/:id/undo` with the same
 * surface.
 */
export type InboxClient = {
  /** Fetch the current inbox snapshot: summary plus joined items. */
  getInbox: () => Promise<Inbox>;
  /** Approve or deny a pending sensitive action and return the updated inbox. */
  resolveApproval: (
    approvalId: string,
    input: ResolveApprovalInput
  ) => Promise<Inbox>;
  /** Undo a previously executed action and return the updated inbox. */
  undoAction: (ledgerEntryId: string, emailId: string) => Promise<Inbox>;
};

const APPROVE_LATENCY_MS = 220;

/** Simulated network delay so loading affordances are observable in the mock. */
function delay(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, APPROVE_LATENCY_MS));
}

/** Freshly minted ledger-entry id for a mock user action. */
function ledgerId(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 8)}`;
}

/** Recompute an inbox payload after its item list has changed. */
function withSummary(items: readonly InboxItem[]): Inbox {
  return { summary: summarizeInbox(items), items };
}

/** In-memory `InboxClient` whose mutations persist for the session's lifetime. */
function createMockInboxClient(): InboxClient {
  let inbox = buildMockInbox();

  const approve = (item: InboxItem, input: ResolveApprovalInput): InboxItem => {
    const approval = item.pendingApproval;
    if (approval === null) {
      return item;
    }
    const body =
      input.editedBody ??
      (typeof approval.payload.body === 'string' ? approval.payload.body : '');
    const entry: LedgerEntry = {
      id: ledgerId('le-appr'),
      actor: 'user',
      emailId: item.email.id,
      action: approval.action,
      summary: `Approved: ${approval.summary}`,
      payload: { ...approval.payload, body },
      undoneBy: null,
      undoes: null,
      createdAt: new Date().toISOString()
    };
    return {
      ...item,
      status: 'done_for_you',
      pendingApproval: null,
      actions: [entry, ...item.actions]
    };
  };

  const deny = (item: InboxItem): InboxItem => {
    const approval = item.pendingApproval;
    if (approval === null) {
      return item;
    }
    const entry: LedgerEntry = {
      id: ledgerId('le-deny'),
      actor: 'user',
      emailId: item.email.id,
      action: 'flag_for_review',
      summary: `Denied: ${approval.summary} — kept for manual handling`,
      payload: {},
      undoneBy: null,
      undoes: null,
      createdAt: new Date().toISOString()
    };
    return {
      ...item,
      status: 'needs_attention',
      pendingApproval: null,
      actions: [entry, ...item.actions]
    };
  };

  return {
    getInbox: async () => {
      await delay();
      return inbox;
    },
    resolveApproval: async (approvalId, input) => {
      await delay();
      const items = inbox.items.map((item) => {
        if (item.pendingApproval?.id !== approvalId) {
          return item;
        }
        return input.verdict === 'approve' ? approve(item, input) : deny(item);
      });
      inbox = withSummary(items);
      return inbox;
    },
    undoAction: async (ledgerEntryId, emailId) => {
      await delay();
      const items = inbox.items.map((item) => {
        if (item.email.id !== emailId) {
          return item;
        }
        const target = item.actions.find((entry) => entry.id === ledgerEntryId);
        if (target === undefined || target.undoneBy !== null) {
          return item;
        }
        const undoEntry: LedgerEntry = {
          id: ledgerId('le-undo'),
          actor: 'user',
          emailId,
          action: 'undo',
          summary: `Undid: ${target.summary}`,
          payload: {},
          undoneBy: null,
          undoes: target.id,
          createdAt: new Date().toISOString()
        };
        const actions = item.actions.map((entry) =>
          entry.id === target.id ? { ...entry, undoneBy: undoEntry.id } : entry
        );
        const undone: InboxItem = {
          ...item,
          status: 'needs_attention',
          actions: [undoEntry, ...actions]
        };
        return undone;
      });
      inbox = withSummary(items);
      return inbox;
    }
  };
}

/** Shared mock client instance for the inbox UI. */
export const inboxClient: InboxClient = createMockInboxClient();
